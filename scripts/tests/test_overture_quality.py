import copy
import importlib.util
from pathlib import Path
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[2]
def load(name,file):
    spec=importlib.util.spec_from_file_location(name,ROOT/'scripts'/'international'/file)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module
builder=load('overture_builder','build-overture-seed.py')
auditor=load('overture_auditor','audit-generated-market-seed.py')

class OvertureQuality(unittest.TestCase):
    def setUp(self):
        self.area={'id':'es-barcelona','countryCode':'ES','city':'Barcelona','bbox':[2,41.3,2.3,41.5]}
        self.row={'id':'test-place-123','names':{'primary':"Café L'Étoile"},'taxonomy':{'hierarchy':['food_and_drink'],'primary':'cafe'},'confidence':0.91,'bbox':{'xmin':2.15,'ymin':41.4},'addresses':[{'country':'ES','locality':'Barcelona','freeform':'Calle de prueba 1'}],'websites':[{'value':'https://example.com'}],'phones':[{'value':'+34 931 234 567'}],'sources':[{'dataset':'test-source','record_id':'public-id'}],'version':2}

    def test_current_taxonomy_and_structured_contacts_keep_source_lineage(self):
        record=builder.normalize_record(self.row,self.area,'2026-10-21.0')
        self.assertEqual(record['category'],'restaurantes')
        self.assertEqual(record['website'],'https://example.com')
        self.assertEqual(record['phone'],'+34 931 234 567')
        self.assertEqual(record['provenance']['sources'],self.row['sources'])

    def test_bad_confidence_and_closed_places_do_not_enter_active_inventory(self):
        for confidence in [float('nan'),float('inf'),1.01,-1,'bad',None]:
            with self.subTest(confidence=confidence):
                self.assertIsNone(builder.normalize_record({**self.row,'confidence':confidence},self.area,'release'))
        for status in ['closed','permanently_closed','temporarily_closed']:
            self.assertIsNone(builder.normalize_record({**self.row,'operating_status':status},self.area,'release'))

    def test_missing_identity_and_outside_or_invalid_point_are_rejected(self):
        self.assertIsNone(builder.normalize_record({**self.row,'id':None},self.area,'release'))
        for coordinates in [[float('nan'),41.4],[3,41.4],[2.15,91]]:
            self.assertIsNone(builder.normalize_record({**self.row,'geometry':{'type':'Point','coordinates':coordinates}},self.area,'release'))
        self.assertIsNone(builder.normalize_record({**self.row,'geometry':{'type':'LineString','coordinates':[]}},self.area,'release'))
        wrong=copy.deepcopy(self.row);wrong['addresses'][0]['country']='FR'
        self.assertIsNone(builder.normalize_record(wrong,self.area,'release'))

    def test_unsafe_websites_are_removed(self):
        for value in ['javascript:bad','https://user:password@example.com','https://[bad']:
            self.assertIsNone(builder.normalize_website(value))

    def test_generated_sql_roundtrips_metadata_and_keeps_claims_and_visibility_untouched(self):
        record=builder.normalize_record(self.row,self.area,'2026-10-21.0')
        sql=builder.render_sql({'es-barcelona':[record]},'2026-10-21.0')
        with tempfile.TemporaryDirectory() as directory:
            file=Path(directory)/'seed.sql';file.write_text(sql,encoding='utf8')
            rows=auditor.read_records(file)
            self.assertEqual(rows[0]['name'],self.row['names']['primary'])
            self.assertEqual(rows[0]['confidence'],0.91)
            self.assertEqual(rows[0]['source_dataset'],'overture_places/2026-10-21.0')
            self.assertFalse(rows[0]['is_visible']);self.assertFalse(rows[0]['is_verified'])
            self.assertIn('ON CONFLICT DO NOTHING',sql)
            self.assertNotIn('DO UPDATE',sql)
            # Existing 27-column seed artifacts remain auditable.
            line=next(line for line in sql.splitlines() if line.startswith('(NULL, '))
            tokens=auditor.split_sql_values(line)
            legacy_tokens=tokens[:18]+tokens[20:]
            file.write_text('INSERT INTO public.international_businesses ('+', '.join(auditor.FIELDS)+') VALUES\n('+', '.join(legacy_tokens)+');',encoding='utf8')
            self.assertEqual(auditor.read_records(file)[0]['name'],record['name'])

if __name__=='__main__':
    unittest.main()
