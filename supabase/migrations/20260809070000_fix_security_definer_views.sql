-- Fix Supabase Security Advisory: Security Definer Views
-- Migration: 20260809070000
-- Description: Sets security_invoker = true on existing views using ALTER VIEW (no table dependency errors).

BEGIN;

-- 1. Fix public.chat_top_questions
DO $$
BEGIN
  IF to_regclass('public.chat_top_questions') IS NOT NULL THEN
    ALTER VIEW public.chat_top_questions SET (security_invoker = true);
  END IF;
END $$;

-- 2. Fix public.chat_stats_daily
DO $$
BEGIN
  IF to_regclass('public.chat_stats_daily') IS NOT NULL THEN
    ALTER VIEW public.chat_stats_daily SET (security_invoker = true);
  END IF;
END $$;

-- 3. Fix public.v_security_health (if exists)
DO $$
BEGIN
  IF to_regclass('public.v_security_health') IS NOT NULL THEN
    ALTER VIEW public.v_security_health SET (security_invoker = true);
  END IF;
END $$;

COMMIT;
