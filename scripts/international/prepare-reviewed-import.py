"""Convert a pinned seed to a bounded JSON import after offline quality checks."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--manifest',required=True,type=Path)
    args=parser.parse_args()
    directory=Path(__file__).resolve().parent
    manifest=json.loads(args.manifest.read_text(encoding='utf8'))
    source=Path(manifest['sqlFile'])
    if hashlib.sha256(source.read_bytes()).hexdigest()!=manifest['checksumSha256']:
        raise ValueError('SQL checksum does not match the extraction manifest')
    spec=importlib.util.spec_from_file_location('audit_seed',directory/'audit-generated-market-seed.py')
    auditor=importlib.util.module_from_spec(spec);spec.loader.exec_module(auditor)
    config=json.loads((directory/'expansion-markets.json').read_text(encoding='utf8'))
    market=next(m for m in config['markets'] if m['id']==manifest['marketId'])
    audit,_=auditor.audit(source,{**market,'targetRecords':manifest['targetRecords']},100)
    if not audit['automatedAuditPassed']:
        raise ValueError('Content audit failed: '+', '.join(audit['failures']))
    rows=auditor.read_records(source)
    if len(rows)!=1000:
        raise ValueError('This importer prepares exactly 1000 records per city sample')
    quality=manifest['automatedQualityChecks']
    if any(quality.get(key,1)!=0 for key in ['invalidCoordinates','outsideApprovedBbox','duplicateRecords']):
        raise ValueError('Extraction quality checks failed')
    if len(quality['categoryDistribution'])<4 or max(quality['categoryDistribution'].values())>400:
        raise ValueError('The sample does not have enough category diversity')
    output=args.manifest.with_suffix('.records.json')
    output.write_text(json.dumps(rows,ensure_ascii=False,allow_nan=False),encoding='utf8')
    review={
        'marketId':market['id'],'sourceRelease':manifest['sourceRelease'],
        'recordCount':len(rows),'recordsFile':str(output),
        'recordsChecksumSha256':hashlib.sha256(output.read_bytes()).hexdigest(),
        'extractionChecksumSha256':manifest['checksumSha256'],
        'automatedQualityChecks':quality,'audit':audit,
        'publicationStatus':'hidden_until_separate_publication_review',
        'independentLocationVerification':False
    }
    args.manifest.with_suffix('.review.json').write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps({'marketId':market['id'],'preparedRecords':len(rows),'categoryCount':len(quality['categoryDistribution']),'status':review['publicationStatus']}))

if __name__=='__main__':
    main()
