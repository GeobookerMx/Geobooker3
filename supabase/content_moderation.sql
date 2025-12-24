-- ==========================================================
-- CONTENT MODERATION FOR COMMUNITY COMMENTS
-- Blocks offensive words and profanity
-- ==========================================================

-- 1. Create blocked words table
CREATE TABLE IF NOT EXISTS blocked_words (
    id SERIAL PRIMARY KEY,
    word TEXT NOT NULL UNIQUE,
    category TEXT DEFAULT 'profanity', -- profanity, spam, threats, etc.
    severity INTEGER DEFAULT 1, -- 1 = block, 2 = require approval
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert common blocked words (Spanish profanity and offensive terms)
INSERT INTO blocked_words (word, category, severity) VALUES
    -- Profanity
    ('puto', 'profanity', 1),
    ('puta', 'profanity', 1),
    ('pendejo', 'profanity', 1),
    ('pendeja', 'profanity', 1),
    ('chingada', 'profanity', 1),
    ('chingar', 'profanity', 1),
    ('chingon', 'profanity', 1),
    ('verga', 'profanity', 1),
    ('culero', 'profanity', 1),
    ('cabron', 'profanity', 1),
    ('cabrona', 'profanity', 1),
    ('mierda', 'profanity', 1),
    ('joder', 'profanity', 1),
    ('jodido', 'profanity', 1),
    ('mamada', 'profanity', 1),
    ('mamón', 'profanity', 1),
    ('huevon', 'profanity', 1),
    ('idiota', 'profanity', 1),
    ('estupido', 'profanity', 1),
    ('imbecil', 'profanity', 1),
    ('maldito', 'profanity', 1),
    ('carajo', 'profanity', 1),
    ('coño', 'profanity', 1),
    ('culo', 'profanity', 1),
    ('cagar', 'profanity', 1),
    ('maricon', 'profanity', 1),
    ('perra', 'profanity', 1),
    ('bastardo', 'profanity', 1),
    ('zorra', 'profanity', 1),
    ('pinche', 'profanity', 1),
    ('ojete', 'profanity', 1),
    ('chingados', 'profanity', 1),
    ('madrazo', 'profanity', 1),
    ('joto', 'profanity', 1),
    ('pedo', 'profanity', 1),
    -- English profanity
    ('fuck', 'profanity', 1),
    ('shit', 'profanity', 1),
    ('bitch', 'profanity', 1),
    ('asshole', 'profanity', 1),
    ('bastard', 'profanity', 1),
    ('dick', 'profanity', 1),
    ('pussy', 'profanity', 1),
    ('cunt', 'profanity', 1),
    ('damn', 'profanity', 1),
    ('ass', 'profanity', 1),
    ('whore', 'profanity', 1),
    ('slut', 'profanity', 1),
    -- Threats
    ('matar', 'threats', 1),
    ('muerte', 'threats', 2),
    ('amenaza', 'threats', 1),
    -- Spam patterns
    ('ganar dinero rapido', 'spam', 1),
    ('oferta exclusiva', 'spam', 2),
    ('click aqui', 'spam', 2)
ON CONFLICT (word) DO NOTHING;

-- 3. Function to check content for blocked words
CREATE OR REPLACE FUNCTION check_content_moderation(p_content TEXT)
RETURNS JSONB AS $$
DECLARE
    v_content_lower TEXT;
    v_blocked_word RECORD;
    v_found_words TEXT[] := '{}';
    v_is_blocked BOOLEAN := false;
BEGIN
    v_content_lower := LOWER(TRIM(p_content));
    
    -- Check each blocked word
    FOR v_blocked_word IN 
        SELECT word, category, severity 
        FROM blocked_words 
        WHERE v_content_lower LIKE '%' || word || '%'
    LOOP
        v_found_words := array_append(v_found_words, v_blocked_word.word);
        IF v_blocked_word.severity = 1 THEN
            v_is_blocked := true;
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object(
        'is_clean', array_length(v_found_words, 1) IS NULL,
        'is_blocked', v_is_blocked,
        'found_words', v_found_words,
        'message', CASE 
            WHEN v_is_blocked THEN 'Contenido bloqueado por lenguaje inapropiado'
            WHEN array_length(v_found_words, 1) > 0 THEN 'Contenido requiere revisión'
            ELSE 'OK'
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Updated function to add comment with moderation
CREATE OR REPLACE FUNCTION add_community_comment(
    p_post_id UUID,
    p_content TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_comment_id UUID;
    v_user_name TEXT;
    v_moderation JSONB;
BEGIN
    -- Check moderation first
    v_moderation := check_content_moderation(p_content);
    
    -- If blocked, reject immediately
    IF (v_moderation->>'is_blocked')::boolean THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Tu comentario contiene lenguaje inapropiado. Por favor, mantén un ambiente respetuoso.',
            'blocked', true
        );
    END IF;
    
    -- Get user name
    SELECT COALESCE(full_name, LEFT(email, POSITION('@' IN email) - 1)) INTO v_user_name
    FROM user_profiles
    WHERE id = auth.uid();
    
    IF v_user_name IS NULL THEN
        v_user_name := 'Usuario';
    END IF;
    
    -- Insert comment (auto-approve if clean, require approval if suspicious)
    INSERT INTO community_comments (
        post_id, 
        user_id, 
        user_name, 
        content, 
        is_approved
    )
    VALUES (
        p_post_id, 
        auth.uid(), 
        v_user_name, 
        p_content,
        (v_moderation->>'is_clean')::boolean -- Auto-approve only if completely clean
    )
    RETURNING id INTO v_comment_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'comment_id', v_comment_id,
        'pending_review', NOT (v_moderation->>'is_clean')::boolean,
        'message', CASE 
            WHEN (v_moderation->>'is_clean')::boolean THEN '¡Comentario publicado!'
            ELSE 'Tu comentario será revisado antes de publicarse'
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC to get blocked words for admin
CREATE OR REPLACE FUNCTION get_blocked_words()
RETURNS TABLE (id INT, word TEXT, category TEXT, severity INT) AS $$
BEGIN
    RETURN QUERY SELECT bw.id, bw.word, bw.category, bw.severity 
    FROM blocked_words bw 
    ORDER BY bw.category, bw.word;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC to add blocked word (admin only)
CREATE OR REPLACE FUNCTION add_blocked_word(p_word TEXT, p_category TEXT DEFAULT 'profanity', p_severity INT DEFAULT 1)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO blocked_words (word, category, severity)
    VALUES (LOWER(TRIM(p_word)), p_category, p_severity)
    ON CONFLICT (word) DO UPDATE SET severity = EXCLUDED.severity;
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION check_content_moderation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_community_comment(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_blocked_words() TO authenticated;
GRANT EXECUTE ON FUNCTION add_blocked_word(TEXT, TEXT, INT) TO authenticated;

-- 8. Verify
SELECT 'Content moderation installed!' as status;
SELECT COUNT(*) as blocked_words_count FROM blocked_words;
