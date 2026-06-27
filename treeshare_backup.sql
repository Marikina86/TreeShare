--
-- PostgreSQL database dump
--

\restrict 1TFyjE1SfMuv9K7hvDoZnSvCvshnUytzvJz0yPVT3nncDLVHf7ljuPgmpnEN6WZ

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_audit_log (
    id integer NOT NULL,
    admin_id text NOT NULL,
    action text NOT NULL,
    target_type text NOT NULL,
    target_id text,
    metadata json,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.admin_audit_log OWNER TO postgres;

--
-- Name: admin_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_audit_log_id_seq OWNER TO postgres;

--
-- Name: admin_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_audit_log_id_seq OWNED BY public.admin_audit_log.id;


--
-- Name: adoptable_trees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.adoptable_trees (
    id integer NOT NULL,
    owner_id text NOT NULL,
    owner_email text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    species_name text,
    latitude real NOT NULL,
    longitude real NOT NULL,
    image_url text,
    thumbnail_url text,
    product_description text,
    price_cents integer DEFAULT 500 NOT NULL,
    duration_days integer DEFAULT 365 NOT NULL,
    max_adoptions integer DEFAULT 10 NOT NULL,
    current_adoptions integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    paused boolean DEFAULT false NOT NULL,
    location_name text,
    moderation_status text DEFAULT 'pending'::text NOT NULL,
    moderation_message text
);


ALTER TABLE public.adoptable_trees OWNER TO postgres;

--
-- Name: adoptable_trees_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.adoptable_trees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.adoptable_trees_id_seq OWNER TO postgres;

--
-- Name: adoptable_trees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.adoptable_trees_id_seq OWNED BY public.adoptable_trees.id;


--
-- Name: alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alerts (
    id integer NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    created_by text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    target_group text DEFAULT 'all'::text NOT NULL
);


ALTER TABLE public.alerts OWNER TO postgres;

--
-- Name: alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.alerts_id_seq OWNER TO postgres;

--
-- Name: alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.alerts_id_seq OWNED BY public.alerts.id;


--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_settings (
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_by text
);


ALTER TABLE public.app_settings OWNER TO postgres;

--
-- Name: banned_emails; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.banned_emails (
    id integer NOT NULL,
    email text NOT NULL,
    reason text NOT NULL,
    banned_at timestamp without time zone DEFAULT now() NOT NULL,
    banned_by text
);


ALTER TABLE public.banned_emails OWNER TO postgres;

--
-- Name: banned_emails_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.banned_emails_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.banned_emails_id_seq OWNER TO postgres;

--
-- Name: banned_emails_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.banned_emails_id_seq OWNED BY public.banned_emails.id;


--
-- Name: campaign_pricing; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.campaign_pricing (
    id integer NOT NULL,
    duration_days integer NOT NULL,
    price_cents integer NOT NULL,
    label text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.campaign_pricing OWNER TO postgres;

--
-- Name: campaign_pricing_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.campaign_pricing_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.campaign_pricing_id_seq OWNER TO postgres;

--
-- Name: campaign_pricing_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.campaign_pricing_id_seq OWNED BY public.campaign_pricing.id;


--
-- Name: co2_rankings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.co2_rankings (
    id integer NOT NULL,
    month text NOT NULL,
    rank integer NOT NULL,
    comune text NOT NULL,
    provincia text,
    tree_count integer NOT NULL,
    co2_kg real NOT NULL,
    badge text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    distinct_planters integer
);


ALTER TABLE public.co2_rankings OWNER TO postgres;

--
-- Name: co2_rankings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.co2_rankings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.co2_rankings_id_seq OWNER TO postgres;

--
-- Name: co2_rankings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.co2_rankings_id_seq OWNED BY public.co2_rankings.id;


--
-- Name: cookie_consents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cookie_consents (
    id character varying(36) DEFAULT gen_random_uuid() NOT NULL,
    user_id text,
    session_id text NOT NULL,
    necessary boolean DEFAULT true NOT NULL,
    analytics boolean DEFAULT false NOT NULL,
    marketing boolean DEFAULT false NOT NULL,
    preferences boolean DEFAULT false NOT NULL,
    accepted boolean NOT NULL,
    accepted_at timestamp without time zone DEFAULT now() NOT NULL,
    ip_address text,
    user_agent text
);


ALTER TABLE public.cookie_consents OWNER TO postgres;

--
-- Name: discount_code_notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.discount_code_notifications (
    id integer NOT NULL,
    discount_code_id integer NOT NULL,
    target text NOT NULL,
    notification_type text NOT NULL,
    recipient_count integer DEFAULT 0 NOT NULL,
    sent_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.discount_code_notifications OWNER TO postgres;

--
-- Name: discount_code_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.discount_code_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.discount_code_notifications_id_seq OWNER TO postgres;

--
-- Name: discount_code_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.discount_code_notifications_id_seq OWNED BY public.discount_code_notifications.id;


--
-- Name: discount_code_uses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.discount_code_uses (
    id integer NOT NULL,
    discount_code_id integer NOT NULL,
    user_key text NOT NULL,
    campaign_id integer,
    used_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.discount_code_uses OWNER TO postgres;

--
-- Name: discount_code_uses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.discount_code_uses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.discount_code_uses_id_seq OWNER TO postgres;

--
-- Name: discount_code_uses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.discount_code_uses_id_seq OWNED BY public.discount_code_uses.id;


--
-- Name: discount_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.discount_codes (
    id integer NOT NULL,
    code text NOT NULL,
    discount_type text NOT NULL,
    discount_value integer NOT NULL,
    duration_days integer NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    max_uses integer,
    use_count integer DEFAULT 0 NOT NULL,
    campaign_id integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.discount_codes OWNER TO postgres;

--
-- Name: discount_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.discount_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.discount_codes_id_seq OWNER TO postgres;

--
-- Name: discount_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.discount_codes_id_seq OWNED BY public.discount_codes.id;


--
-- Name: donation_campaigns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.donation_campaigns (
    id integer NOT NULL,
    user_id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    photos json DEFAULT '[]'::json NOT NULL,
    duration_days integer,
    expires_at timestamp without time zone,
    payment_status text DEFAULT 'draft'::text NOT NULL,
    stripe_payment_intent_id text,
    price_paid_cents integer,
    archived_at timestamp without time zone,
    storage_tier text DEFAULT 'hot'::text NOT NULL,
    expiry_notification_sent_at timestamp without time zone,
    in_app_expiry_notified_at timestamp without time zone,
    renewal_stripe_payment_intent_id text,
    renewal_duration_days integer,
    renewal_price_cents integer,
    paypal_order_id text,
    renewal_paypal_order_id text,
    discount_code_id integer,
    discount_applied_cents integer,
    comune text,
    provincia text
);


ALTER TABLE public.donation_campaigns OWNER TO postgres;

--
-- Name: donation_campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.donation_campaigns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.donation_campaigns_id_seq OWNER TO postgres;

--
-- Name: donation_campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.donation_campaigns_id_seq OWNED BY public.donation_campaigns.id;


--
-- Name: event_participants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_participants (
    id integer NOT NULL,
    event_id integer NOT NULL,
    user_id text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.event_participants OWNER TO postgres;

--
-- Name: event_participants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.event_participants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.event_participants_id_seq OWNER TO postgres;

--
-- Name: event_participants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.event_participants_id_seq OWNED BY public.event_participants.id;


--
-- Name: events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.events (
    id integer NOT NULL,
    user_id text NOT NULL,
    title text NOT NULL,
    description text,
    location text NOT NULL,
    address text,
    city text,
    province text,
    event_date text NOT NULL,
    event_time text NOT NULL,
    end_date text,
    end_time text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    moderation_status text DEFAULT 'approved'::text NOT NULL,
    moderation_message text,
    reviewed_by text,
    reviewed_at timestamp without time zone
);


ALTER TABLE public.events OWNER TO postgres;

--
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.events_id_seq OWNER TO postgres;

--
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organizations (
    id integer NOT NULL,
    ragione_sociale text NOT NULL,
    partita_iva text NOT NULL,
    codice_fiscale text NOT NULL,
    codice_univoco text NOT NULL,
    forma_giuridica text NOT NULL,
    numero_registro_imprese text,
    indirizzo_via text NOT NULL,
    indirizzo_citta text NOT NULL,
    indirizzo_cap text NOT NULL,
    indirizzo_stato text NOT NULL,
    email_ufficiale text NOT NULL,
    telefono text NOT NULL,
    referente_nome text NOT NULL,
    referente_cognome text NOT NULL,
    username text NOT NULL,
    hashed_password text NOT NULL,
    ruolo_utente text NOT NULL,
    numero_licenze integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    pec text
);


ALTER TABLE public.organizations OWNER TO postgres;

--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.organizations_id_seq OWNER TO postgres;

--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;


--
-- Name: payment_ledger; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_ledger (
    id integer NOT NULL,
    type text NOT NULL,
    amount_cents integer NOT NULL,
    currency text DEFAULT 'eur'::text NOT NULL,
    payment_method text NOT NULL,
    stripe_payment_intent_id text,
    paypal_order_id text,
    user_id text NOT NULL,
    entity_user_id text,
    campaign_id integer,
    adoption_id integer,
    description text NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    entity_user_name text,
    entity_denominazione text,
    entity_indirizzo text,
    entity_partita_iva text,
    entity_codice_fiscale text,
    entity_codice_univoco text,
    entity_email text,
    entity_telefono text,
    entity_referente text,
    linked_ledger_id integer,
    refund_intestatario text,
    refund_date timestamp without time zone
);


ALTER TABLE public.payment_ledger OWNER TO postgres;

--
-- Name: payment_ledger_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_ledger_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_ledger_id_seq OWNER TO postgres;

--
-- Name: payment_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_ledger_id_seq OWNED BY public.payment_ledger.id;


--
-- Name: platform_revenue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.platform_revenue (
    id integer NOT NULL,
    total_commissions integer DEFAULT 0 NOT NULL,
    total_payout_fees integer DEFAULT 0 NOT NULL,
    transaction_count integer DEFAULT 0 NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.platform_revenue OWNER TO postgres;

--
-- Name: platform_revenue_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.platform_revenue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.platform_revenue_id_seq OWNER TO postgres;

--
-- Name: platform_revenue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.platform_revenue_id_seq OWNED BY public.platform_revenue.id;


--
-- Name: policies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.policies (
    id character varying(36) DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    version text NOT NULL,
    content text NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    checkbox_label text,
    consent_note text,
    requires_acceptance boolean DEFAULT true NOT NULL,
    last_modified_at timestamp without time zone
);


ALTER TABLE public.policies OWNER TO postgres;

--
-- Name: problem_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.problem_reports (
    id integer NOT NULL,
    user_id text NOT NULL,
    username text,
    category text NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    admin_note text,
    replied_at timestamp without time zone,
    reply_text text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.problem_reports OWNER TO postgres;

--
-- Name: problem_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.problem_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.problem_reports_id_seq OWNER TO postgres;

--
-- Name: problem_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.problem_reports_id_seq OWNED BY public.problem_reports.id;


--
-- Name: reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reports (
    id integer NOT NULL,
    reporter_user_id text NOT NULL,
    reported_user_id text,
    reported_username text,
    tree_id integer,
    event_id integer,
    event_title text,
    reason text NOT NULL,
    notes text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    tree_update_id integer
);


ALTER TABLE public.reports OWNER TO postgres;

--
-- Name: reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reports_id_seq OWNER TO postgres;

--
-- Name: reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reports_id_seq OWNED BY public.reports.id;


--
-- Name: tips; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tips (
    id integer NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    image_url text
);


ALTER TABLE public.tips OWNER TO postgres;

--
-- Name: tips_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tips_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tips_id_seq OWNER TO postgres;

--
-- Name: tips_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tips_id_seq OWNED BY public.tips.id;


--
-- Name: trail_report_confirmations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trail_report_confirmations (
    id integer NOT NULL,
    report_id integer NOT NULL,
    user_id text NOT NULL,
    type text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.trail_report_confirmations OWNER TO postgres;

--
-- Name: trail_report_confirmations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.trail_report_confirmations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.trail_report_confirmations_id_seq OWNER TO postgres;

--
-- Name: trail_report_confirmations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.trail_report_confirmations_id_seq OWNED BY public.trail_report_confirmations.id;


--
-- Name: trail_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trail_reports (
    id integer NOT NULL,
    user_id text NOT NULL,
    type text NOT NULL,
    description text,
    latitude real NOT NULL,
    longitude real NOT NULL,
    location_name text,
    status text DEFAULT 'active'::text NOT NULL,
    archived_at timestamp without time zone,
    archived_reason text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    photo_url text
);


ALTER TABLE public.trail_reports OWNER TO postgres;

--
-- Name: trail_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.trail_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.trail_reports_id_seq OWNER TO postgres;

--
-- Name: trail_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.trail_reports_id_seq OWNED BY public.trail_reports.id;


--
-- Name: tree_adoptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tree_adoptions (
    id integer NOT NULL,
    user_id text NOT NULL,
    tree_id integer NOT NULL,
    tree_name text NOT NULL,
    duration_days integer NOT NULL,
    start_date timestamp without time zone DEFAULT now() NOT NULL,
    end_date timestamp without time zone NOT NULL,
    amount_cents integer NOT NULL,
    platform_fee_cents integer NOT NULL,
    net_to_entity_cents integer NOT NULL,
    stripe_payment_intent_id text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    expiry_notified_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    adoption_code text,
    org_status text,
    shipping_data text,
    user_name text,
    user_phone text
);


ALTER TABLE public.tree_adoptions OWNER TO postgres;

--
-- Name: tree_adoptions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tree_adoptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tree_adoptions_id_seq OWNER TO postgres;

--
-- Name: tree_adoptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tree_adoptions_id_seq OWNED BY public.tree_adoptions.id;


--
-- Name: tree_status_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tree_status_reports (
    id integer NOT NULL,
    tree_id integer NOT NULL,
    quarter text NOT NULL,
    status text NOT NULL,
    photo_url text,
    reported_at timestamp without time zone DEFAULT now() NOT NULL,
    photo_status text DEFAULT 'pending'::text
);


ALTER TABLE public.tree_status_reports OWNER TO postgres;

--
-- Name: tree_status_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tree_status_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tree_status_reports_id_seq OWNER TO postgres;

--
-- Name: tree_status_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tree_status_reports_id_seq OWNED BY public.tree_status_reports.id;


--
-- Name: tree_suns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tree_suns (
    id integer NOT NULL,
    tree_id integer NOT NULL,
    user_id text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tree_suns OWNER TO postgres;

--
-- Name: tree_suns_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tree_suns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tree_suns_id_seq OWNER TO postgres;

--
-- Name: tree_suns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tree_suns_id_seq OWNED BY public.tree_suns.id;


--
-- Name: tree_updates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tree_updates (
    id integer NOT NULL,
    tree_id integer NOT NULL,
    user_id text NOT NULL,
    photo_url text,
    note text,
    photo_status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tree_updates OWNER TO postgres;

--
-- Name: tree_updates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tree_updates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tree_updates_id_seq OWNER TO postgres;

--
-- Name: tree_updates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tree_updates_id_seq OWNED BY public.tree_updates.id;


--
-- Name: trees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trees (
    id integer NOT NULL,
    user_id text NOT NULL,
    photo_url text NOT NULL,
    photo_thumbnail_url text,
    plant_name text,
    caption text,
    species text,
    planted_at timestamp without time zone,
    latitude real NOT NULL,
    longitude real NOT NULL,
    location_name text,
    country text,
    province text,
    maps_url text,
    verification_bypassed boolean DEFAULT false NOT NULL,
    photo_status text DEFAULT 'pending'::text NOT NULL,
    sun_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.trees OWNER TO postgres;

--
-- Name: trees_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.trees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.trees_id_seq OWNER TO postgres;

--
-- Name: trees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.trees_id_seq OWNED BY public.trees.id;


--
-- Name: user_consents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_consents (
    id character varying(36) DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    policy_id character varying(36) NOT NULL,
    accepted boolean NOT NULL,
    accepted_at timestamp without time zone DEFAULT now() NOT NULL,
    ip_address text,
    user_agent text
);


ALTER TABLE public.user_consents OWNER TO postgres;

--
-- Name: user_notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_notifications (
    id integer NOT NULL,
    user_id text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    type text,
    related_id integer
);


ALTER TABLE public.user_notifications OWNER TO postgres;

--
-- Name: user_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_notifications_id_seq OWNER TO postgres;

--
-- Name: user_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_notifications_id_seq OWNED BY public.user_notifications.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    clerk_user_id text NOT NULL,
    username text NOT NULL,
    photo_url text,
    country text,
    city text,
    trees_planted integer DEFAULT 0 NOT NULL,
    is_blocked boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    account_type text DEFAULT 'user'::text NOT NULL,
    stripe_account_id text
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: weekly_winners; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.weekly_winners (
    id integer NOT NULL,
    tree_id integer NOT NULL,
    user_id text NOT NULL,
    province text NOT NULL,
    sun_count integer NOT NULL,
    week_start timestamp without time zone NOT NULL
);


ALTER TABLE public.weekly_winners OWNER TO postgres;

--
-- Name: weekly_winners_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.weekly_winners_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.weekly_winners_id_seq OWNER TO postgres;

--
-- Name: weekly_winners_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.weekly_winners_id_seq OWNED BY public.weekly_winners.id;


--
-- Name: admin_audit_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_audit_log ALTER COLUMN id SET DEFAULT nextval('public.admin_audit_log_id_seq'::regclass);


--
-- Name: adoptable_trees id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.adoptable_trees ALTER COLUMN id SET DEFAULT nextval('public.adoptable_trees_id_seq'::regclass);


--
-- Name: alerts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts ALTER COLUMN id SET DEFAULT nextval('public.alerts_id_seq'::regclass);


--
-- Name: banned_emails id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.banned_emails ALTER COLUMN id SET DEFAULT nextval('public.banned_emails_id_seq'::regclass);


--
-- Name: campaign_pricing id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign_pricing ALTER COLUMN id SET DEFAULT nextval('public.campaign_pricing_id_seq'::regclass);


--
-- Name: co2_rankings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.co2_rankings ALTER COLUMN id SET DEFAULT nextval('public.co2_rankings_id_seq'::regclass);


--
-- Name: discount_code_notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discount_code_notifications ALTER COLUMN id SET DEFAULT nextval('public.discount_code_notifications_id_seq'::regclass);


--
-- Name: discount_code_uses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discount_code_uses ALTER COLUMN id SET DEFAULT nextval('public.discount_code_uses_id_seq'::regclass);


--
-- Name: discount_codes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discount_codes ALTER COLUMN id SET DEFAULT nextval('public.discount_codes_id_seq'::regclass);


--
-- Name: donation_campaigns id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.donation_campaigns ALTER COLUMN id SET DEFAULT nextval('public.donation_campaigns_id_seq'::regclass);


--
-- Name: event_participants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_participants ALTER COLUMN id SET DEFAULT nextval('public.event_participants_id_seq'::regclass);


--
-- Name: events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);


--
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);


--
-- Name: payment_ledger id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_ledger ALTER COLUMN id SET DEFAULT nextval('public.payment_ledger_id_seq'::regclass);


--
-- Name: platform_revenue id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_revenue ALTER COLUMN id SET DEFAULT nextval('public.platform_revenue_id_seq'::regclass);


--
-- Name: problem_reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.problem_reports ALTER COLUMN id SET DEFAULT nextval('public.problem_reports_id_seq'::regclass);


--
-- Name: reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports ALTER COLUMN id SET DEFAULT nextval('public.reports_id_seq'::regclass);


--
-- Name: tips id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tips ALTER COLUMN id SET DEFAULT nextval('public.tips_id_seq'::regclass);


--
-- Name: trail_report_confirmations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trail_report_confirmations ALTER COLUMN id SET DEFAULT nextval('public.trail_report_confirmations_id_seq'::regclass);


--
-- Name: trail_reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trail_reports ALTER COLUMN id SET DEFAULT nextval('public.trail_reports_id_seq'::regclass);


--
-- Name: tree_adoptions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tree_adoptions ALTER COLUMN id SET DEFAULT nextval('public.tree_adoptions_id_seq'::regclass);


--
-- Name: tree_status_reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tree_status_reports ALTER COLUMN id SET DEFAULT nextval('public.tree_status_reports_id_seq'::regclass);


--
-- Name: tree_suns id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tree_suns ALTER COLUMN id SET DEFAULT nextval('public.tree_suns_id_seq'::regclass);


--
-- Name: tree_updates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tree_updates ALTER COLUMN id SET DEFAULT nextval('public.tree_updates_id_seq'::regclass);


--
-- Name: trees id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trees ALTER COLUMN id SET DEFAULT nextval('public.trees_id_seq'::regclass);


--
-- Name: user_notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notifications ALTER COLUMN id SET DEFAULT nextval('public.user_notifications_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: weekly_winners id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_winners ALTER COLUMN id SET DEFAULT nextval('public.weekly_winners_id_seq'::regclass);


--
-- Data for Name: admin_audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_audit_log (id, admin_id, action, target_type, target_id, metadata, created_at) FROM stdin;
1	54727c82-ebca-4605-a3c9-e0e920b55cb6	event_approved	event	8	{"title":"Camminata nella natura"}	2026-05-03 09:54:48.896363
\.


--
-- Data for Name: adoptable_trees; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.adoptable_trees (id, owner_id, owner_email, title, description, species_name, latitude, longitude, image_url, thumbnail_url, product_description, price_cents, duration_days, max_adoptions, current_adoptions, status, created_at, updated_at, paused, location_name, moderation_status, moderation_message) FROM stdin;
40	593e94bc-b922-4578-a3aa-55c85eff0946	ricetta86@libero.it	Nina	Prova location	Castagno	44.386818	7.488725	/objects/uploads/8ecb2579-c36f-4843-8581-dfbc98c89018.jpg	/objects/uploads/4767c89d-4a47-429f-aa95-4459a794fc9e.jpg	\N	6000	90	10	1	active	2026-04-17 07:55:32.047992	2026-04-22 18:04:22.255	f	San Defendente, Piemonte, Italia	approved	\N
39	593e94bc-b922-4578-a3aa-55c85eff0946	ricetta86@libero.it	Albino	Ulivo prova finto	Prova	44.3668	7.464933	/objects/uploads/8d38e1c2-f627-4145-aba2-6170d100161c.jpg	/objects/uploads/5a453f98-ba8b-4c46-b1e9-e29856a8a8e2.jpg	\N	4500	90	10	1	active	2026-04-16 15:46:45.655707	2026-04-22 18:04:23.564	f	\N	approved	\N
43	593e94bc-b922-4578-a3aa-55c85eff0946	ricetta86@libero.it	Limone	Bello e buono	Limone di Sicilia	45	7	/objects/uploads/d5ae813c-16c6-4ee5-94ed-241424d1872e.webp	/objects/uploads/79781a5f-2965-4c9e-b9f6-22e198763cb8.webp	Limoni	1500	30	10	0	active	2026-04-22 18:06:24.64507	2026-04-22 18:07:15.014	f	Enna	approved	\N
37	593e94bc-b922-4578-a3aa-55c85eff0946	ricetta86@libero.it	Fiorello	Albero decorativo da fiore	Boh	44	23	/objects/uploads/f866f694-4940-4178-8c13-42a710ea9ec9.jpg	/objects/uploads/3e24d85b-11f9-47bf-8579-27059a731123.jpg	\N	1000	30	10	0	active	2026-04-16 15:32:05.384304	2026-05-27 07:19:07.843	f	\N	approved	\N
38	593e94bc-b922-4578-a3aa-55c85eff0946	ricetta86@libero.it	Gino	Gino il castangino	Castagno	43	24	/objects/uploads/0c7d5b26-3298-4e23-94cc-325d9b4328c9.jpg	/objects/uploads/140d434b-9032-4b9c-8e9f-18f599c15731.jpg	\N	3000	30	10	0	active	2026-04-16 15:37:30.121247	2026-05-27 07:19:07.847	f	\N	approved	\N
41	593e94bc-b922-4578-a3aa-55c85eff0946	ricetta86@libero.it	Hdhdbehdhdh	Dhxhzhsbhshsssh	Dhhde	44.39475	7.49055	/objects/uploads/8b5d356f-79b6-47ec-83a6-7c191c35edd6.webp	/objects/uploads/207f5107-e0e5-4e5e-aad8-de4053b247f0.webp	\N	4500	90	10	1	active	2026-04-18 09:48:55.654357	2026-05-27 07:19:07.851	f	San Defendente, Piemonte, Italia	approved	\N
42	593e94bc-b922-4578-a3aa-55c85eff0946	ricetta86@libero.it	Bonsai	Bonsai prova	Bonsai	44	7.5	/objects/uploads/5e16de3f-ff3c-44be-9753-709e32b290a1.webp	/objects/uploads/1470bd1e-7c8c-40ad-aa85-0a70c2dc893d.webp	\N	3000	30	2	0	active	2026-04-22 10:44:01.449428	2026-05-27 07:19:07.855	f	Cuneo, Piemonte, Italia	approved	\N
\.


--
-- Data for Name: alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alerts (id, title, message, priority, created_by, created_at, updated_at, target_group) FROM stdin;
6	Buongiorno	Ciao	normal	54727c82-ebca-4605-a3c9-e0e920b55cb6	2026-04-23 03:17:15.798232	2026-04-23 03:17:15.798232	organization
\.


--
-- Data for Name: app_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_settings (key, value, updated_at, updated_by) FROM stdin;
adoptions_enabled	false	2026-06-11 07:12:57.637	54727c82-ebca-4605-a3c9-e0e920b55cb6
campaigns_enabled	false	2026-06-11 07:13:01.14	54727c82-ebca-4605-a3c9-e0e920b55cb6
\.


--
-- Data for Name: banned_emails; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.banned_emails (id, email, reason, banned_at, banned_by) FROM stdin;
\.


--
-- Data for Name: campaign_pricing; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.campaign_pricing (id, duration_days, price_cents, label, is_active, created_at) FROM stdin;
2	1	99	Giorno	t	2026-04-13 22:08:33.829824
3	20	5099	Mese	t	2026-04-13 22:08:59.614036
1	7	599	Settimana	t	2026-04-13 22:08:18.072404
\.


--
-- Data for Name: co2_rankings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.co2_rankings (id, month, rank, comune, provincia, tree_count, co2_kg, badge, created_at, distinct_planters) FROM stdin;
13	2026-Q1	1	Castelfranco Veneto	TV	24	132	gold	2026-05-21 12:25:08.545785	6
14	2026-Q1	2	Montefalco	PG	15	82.5	silver	2026-05-21 12:25:08.545785	4
15	2026-Q1	3	Alberobello	BA	20	110	bronze	2026-05-21 12:25:08.545785	6
\.


--
-- Data for Name: cookie_consents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cookie_consents (id, user_id, session_id, necessary, analytics, marketing, preferences, accepted, accepted_at, ip_address, user_agent) FROM stdin;
c30731fc-2bbd-4997-b1e4-f328546cc767	\N	test-abc	t	f	f	f	t	2026-04-10 03:11:54.560335	::1	curl/8.14.1
\.


--
-- Data for Name: discount_code_notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.discount_code_notifications (id, discount_code_id, target, notification_type, recipient_count, sent_at) FROM stdin;
1	2	business	in-app	8	2026-05-01 08:42:27.545976
\.


--
-- Data for Name: discount_code_uses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.discount_code_uses (id, discount_code_id, user_key, campaign_id, used_at) FROM stdin;
1	2	user:593e94bc-b922-4578-a3aa-55c85eff0946	22	2026-05-01 08:47:47.83224
2	3	user:593e94bc-b922-4578-a3aa-55c85eff0946	23	2026-05-01 08:52:21.540654
3	4	user:593e94bc-b922-4578-a3aa-55c85eff0946	24	2026-05-01 08:55:32.343476
4	5	user:593e94bc-b922-4578-a3aa-55c85eff0946	26	2026-05-02 09:34:37.39248
\.


--
-- Data for Name: discount_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.discount_codes (id, code, discount_type, discount_value, duration_days, expires_at, max_uses, use_count, campaign_id, is_active, created_at) FROM stdin;
1	SUNA	percentage	10	1	2026-04-16 21:59:00	1	0	\N	t	2026-04-15 20:22:37.344065
2	SPRING2026	percentage	100	1	2026-05-02 21:59:00	1	1	\N	t	2026-05-01 08:42:27.346307
3	MARIKIKA	percentage	10	1	2026-05-02 21:59:00	1	1	\N	t	2026-05-01 08:49:00.119107
4	MARIKIKA86	percentage	100	1	2026-05-02 21:59:00	10	1	\N	t	2026-05-01 08:53:08.306055
5	SPRING	percentage	100	10	2026-05-12 21:59:00	10	1	\N	t	2026-05-02 09:33:38.10761
\.


--
-- Data for Name: donation_campaigns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.donation_campaigns (id, user_id, title, description, is_active, created_at, updated_at, photos, duration_days, expires_at, payment_status, stripe_payment_intent_id, price_paid_cents, archived_at, storage_tier, expiry_notification_sent_at, in_app_expiry_notified_at, renewal_stripe_payment_intent_id, renewal_duration_days, renewal_price_cents, paypal_order_id, renewal_paypal_order_id, discount_code_id, discount_applied_cents, comune, provincia) FROM stdin;
2	user_3C2MvR2bb1lMZIRhO6R10e50qNG	Hshsb	Hshdjdjdjdjdj	t	2026-04-12 07:30:02.107257	2026-04-12 08:15:36.85	["/objects/uploads/32cee6c2-cafe-4bb0-a15e-434dd2d99555.jpg"]	\N	\N	draft	\N	\N	\N	hot	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
4	3c156c0d-15e4-45b8-b0ea-e005e2e60514	Hshshsb	Gzhzbsbsbsbsbsnn	t	2026-04-13 12:07:54.231947	2026-04-13 12:07:54.231947	[]	\N	\N	draft	\N	\N	\N	hot	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
9	593e94bc-b922-4578-a3aa-55c85eff0946	Gsgegevev	Gsgsg	f	2026-04-13 21:50:02.175832	2026-04-13 21:50:02.175832	[]	\N	\N	draft	\N	\N	\N	hot	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
11	593e94bc-b922-4578-a3aa-55c85eff0946	Piantalo	Ripiantiamo piazza Europa	f	2026-04-16 18:26:18.96194	2026-04-16 18:26:18.96194	["/objects/uploads/a59f77bf-a5c3-47bb-980b-49ae0977fb72.webp","/objects/uploads/cd8463cf-3f4e-41d1-b929-5b255ae4bdd7.webp","/objects/uploads/b503a305-0423-41fc-b777-9d57784debb8.webp"]	1	\N	pending	pi_3TMucII4wHZ1JPnl0Cqg9m4s	99	\N	hot	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
12	593e94bc-b922-4578-a3aa-55c85eff0946	Piantalo	Riforestazione piazza	f	2026-04-16 18:33:18.828591	2026-04-16 18:33:18.828591	[]	1	\N	pending	pi_3TMuj4I4wHZ1JPnl1jQLXwYf	99	\N	hot	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
17	593e94bc-b922-4578-a3aa-55c85eff0946	Ledg	Fbbbbbbb	f	2026-04-20 12:59:11.603753	2026-04-20 12:59:11.603753	[]	1	\N	pending	pi_3TOHPvI4wHZ1JPnl0dYpK1wl	99	\N	hot	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
21	593e94bc-b922-4578-a3aa-55c85eff0946	Piantiamo	Pianta	f	2026-05-01 08:36:47.03777	2026-05-03 06:45:13.95	[]	1	2026-05-02 21:59:00	paid	pi_3TSCZ0RDrNs5ZPtD1IPD4x2W	99	2026-05-03 06:45:13.95	cold	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
20	593e94bc-b922-4578-a3aa-55c85eff0946	Piantala	Pianta	f	2026-05-01 08:09:50.503519	2026-05-03 06:45:13.95	[]	1	2026-05-02 21:59:00	paid	pi_3TSC8wRDrNs5ZPtD05iFZLQz	99	2026-05-03 06:45:13.95	cold	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
27	593e94bc-b922-4578-a3aa-55c85eff0946	Ggddb	Gdgdg	f	2026-05-03 16:35:40.859617	2026-05-03 16:35:40.859617	[]	1	\N	pending	pi_3TT2zYI4wHZ1JPnl1LVzSrUV	99	\N	hot	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	AO
26	593e94bc-b922-4578-a3aa-55c85eff0946	Hdhhdhhdbdb	Hdhbdbd	f	2026-05-02 09:34:37.39248	2026-05-04 07:49:29.949	[]	1	2026-05-03 21:59:00	paid	free_1777714477393	0	2026-05-04 07:49:29.949	cold	\N	\N	\N	\N	\N	\N	\N	5	99	Cuneo	CN
22	593e94bc-b922-4578-a3aa-55c85eff0946	Orto sociale	Vsbdhsj	f	2026-05-01 08:46:40.536202	2026-05-09 08:24:55.98	[]	7	2026-05-08 21:59:00	paid	pi_3TSCiaRDrNs5ZPtD0VyCMl6f	0	2026-05-09 08:24:55.98	cold	2026-05-07 21:59:00.028	\N	\N	\N	\N	\N	\N	2	599	\N	\N
23	593e94bc-b922-4578-a3aa-55c85eff0946	Fruttalo	Frutti	f	2026-05-01 08:51:53.19992	2026-05-09 08:24:55.98	[]	7	2026-05-08 21:59:00	paid	pi_3TSCndRDrNs5ZPtD1sjJpfHj	539	2026-05-09 08:24:55.98	cold	2026-05-07 21:59:00.028	\N	\N	\N	\N	\N	\N	3	60	\N	CN
\.


--
-- Data for Name: event_participants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.event_participants (id, event_id, user_id, created_at) FROM stdin;
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.events (id, user_id, title, description, location, address, city, province, event_date, event_time, end_date, end_time, created_at, moderation_status, moderation_message, reviewed_by, reviewed_at) FROM stdin;
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.organizations (id, ragione_sociale, partita_iva, codice_fiscale, codice_univoco, forma_giuridica, numero_registro_imprese, indirizzo_via, indirizzo_citta, indirizzo_cap, indirizzo_stato, email_ufficiale, telefono, referente_nome, referente_cognome, username, hashed_password, ruolo_utente, numero_licenze, created_at, pec) FROM stdin;
3	Kalimocho		03909060042	MDI3490	ditta_individuale		Via castelmagno	Cuneo	12100	Italia	maricaarzu@hotmail.it	+393277829506	Marica	Arzu	Mari	$2b$12$3ofSXw5nBMz7Qt9mLVXBFe8q2J/oS2lVZ4D6TdngIBVv0acFR2cGy	manager	1	2026-04-12 15:47:42.786191	\N
5	Pacho	03909060042	03909060042	MDI3490	srl		Via castelmagno	Cuneo	12100	Italia	pacho86@libero.it	+393277829506	Marica	Arzu	Pacho	$2b$12$QpGouHjjT1t3PGNtEgnbquQ1UrWwFlZw1JznU4gwwpcAWuQ2Xy.Ky	admin	1	2026-04-12 17:07:11.040008	\N
6	Pacho	78313030864	78313030864	MDI3490	altro		Via castelmagno	Cuneo	12100	Italia	cartaigienica86@libero.it	+393277829506	Marica	Arzu	Pacho86	$2b$12$ws3QKHpxSGiobNgCvl152eaxJVZd1xm4QpB56FVF4956l5AUh4iyO	admin	1	2026-04-13 12:05:19.205354	\N
7	Kali	95930555289	95930555289	MDI3490	srl		Via castelmagno	Cuneo	12100	Italia	polenta2026@libero.it	+393277829506	Marica	Arzu	Kali	$2b$12$WjhuMm/SpAOcPI08nGJdQemHkXayTzEEw.0bz0BuQySL.D.KuU3Oy	admin	1	2026-04-13 16:13:48.507002	\N
8	Test Ente SRL	12345678901	12345678901	ABC1234	SRL	\N	Via Test 1	Roma	00100	IT	test-ente-debug2@example.com	+39123456789	Mario	Rossi	testentedebug2	$2b$12$iSABIwcbx2QvTyXqH8mAE.aLm.2K6xJMEID1nRPCyDkWS4ZT6aqtS	admin	1	2026-04-13 16:43:46.232577	\N
9	Kali	69723133745	69723133745	MDI3490	srl		Via castelmagno	Cuneo	12100	Italia	ricetta86@libero.it	+393277829506	Marica	Arzu	Ricetta	$2b$12$FGni4tQxXg1tPNe0hnnbSuCIWLs1lA54ir8ZyUQt5P00LM0VnUNxO	admin	1	2026-04-13 16:46:03.981688	\N
10	Ricetta	05148646010	05148646010	MDI3490	snc		Via castelmagno	Cuneo	12100	Italia	ricettanuova@libero.it	+393277829506	Marica	Arzu	Ricettanuova	$2b$12$nvFhJY/VhZo3OhSLG7GQzeJqx03ZGipK/sXy0teNGUy4ONap2MmHC	admin	1	2026-04-14 08:00:47.498058	\N
11	Pacho	91055390701	91055390701	MDI3490	srl		Via castelmagno	Cuneo	12100	Italia	gavsvvdvd@libero.it	+393277829506	Marica	Arzu	Gshdhbdbehe	$2b$12$aXbl15ZVDgy9gI//mtCrn.GPS2EUBmNpRRud5LnDbayX5/7s6QvwO	admin	1	2026-04-14 13:35:49.103512	\N
13	Kali	93095084591	93095084591	MDI3490	spa		Via Roma 1	Milano	21771	Italia	bisalta2026@libero.it				kali_1491	$2b$12$4owIyUO663pqFwMHz/RLdedzutqL8wIKwaKPF4J./DHQrqv9vOtwe	admin	1	2026-05-01 09:48:02.781768	\N
14	Cucu	14943407115	14943407115	MDI3490	srl		Via Roma 1	Roma	20100	Italia	cuccuruccu26@libero.it				cucu_7505	$2b$12$hB/49DZeW4zvtzgRW84z7.3wdA1DNzmf1xpNf5UBc.JRrE.jqQ2oa	admin	1	2026-05-01 13:52:00.425833	\N
15	Marica	00321375065	00321375065	MDI3490	ente_pubblico		Via castelmagno	Cuneo	12100	Italia	tortilla2026@libero.it		Marica	Arzu	marica_5658	$2b$12$Zh4tud.UuF0gKbTGH0BTZeBXLjLT2lRBBD9t0/1nhigAHMq98uoly	admin	1	2026-05-07 14:44:38.935398	arzumarica@confpec.it
\.


--
-- Data for Name: payment_ledger; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_ledger (id, type, amount_cents, currency, payment_method, stripe_payment_intent_id, paypal_order_id, user_id, entity_user_id, campaign_id, adoption_id, description, deleted_at, deleted_by, created_at, entity_user_name, entity_denominazione, entity_indirizzo, entity_partita_iva, entity_codice_fiscale, entity_codice_univoco, entity_email, entity_telefono, entity_referente, linked_ledger_id, refund_intestatario, refund_date) FROM stdin;
1	campaign_activation	99	eur	stripe	pi_3TOGBmI4wHZ1JPnl0sdJzse4	\N	593e94bc-b922-4578-a3aa-55c85eff0946	\N	15	\N	Attivazione campagna: Prova ledger	\N	\N	2026-04-20 11:41:01.02619	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
2	campaign_activation	99	eur	stripe	pi_3TOGLBI4wHZ1JPnl1CHwvd8h	\N	593e94bc-b922-4578-a3aa-55c85eff0946	\N	16	\N	Attivazione campagna: Prova ledger2	\N	\N	2026-04-20 11:50:45.01666	Az. Agricola F.lli Gatti	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
3	campaign_activation	99	eur	stripe	pi_3TOHX6I4wHZ1JPnl0u7Cs1f6	\N	593e94bc-b922-4578-a3aa-55c85eff0946	593e94bc-b922-4578-a3aa-55c85eff0946	18	\N	Attivazione campagna: Ledger	\N	\N	2026-04-20 13:07:04.757519	Az. Agricola F.lli Gatti	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
4	campaign_activation	99	eur	stripe	pi_3TOHoEI4wHZ1JPnl0UIARSvz	\N	593e94bc-b922-4578-a3aa-55c85eff0946	593e94bc-b922-4578-a3aa-55c85eff0946	19	\N	Attivazione campagna: Ledger2	\N	\N	2026-04-20 13:24:49.286643	Az. Agricola F.lli Gatti	Az. Agricola F.lli Gatti	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
5	refund	99	eur	stripe	\N	\N	54727c82-ebca-4605-a3c9-e0e920b55cb6	593e94bc-b922-4578-a3aa-55c85eff0946	\N	\N	Rimborso: Attivazione campagna: Ledger2	\N	\N	2026-04-20 13:46:52.09717	Az. Agricola F.lli Gatti	Az. Agricola F.lli Gatti	\N	\N	\N	\N	\N	\N	\N	4	Az. Agricola F.lli Gatti	2026-04-20 00:00:00
6	adoption_payment	12000	eur	stripe	pi_3TOxwHI4wHZ1JPnl0kEotKuW	\N	54727c82-ebca-4605-a3c9-e0e920b55cb6	\N	\N	1	Adozione albero: Nina	\N	\N	2026-04-22 10:24:07.522101	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
7	platform_commission	3600	eur	stripe	pi_3TOxwHI4wHZ1JPnl0kEotKuW	\N	54727c82-ebca-4605-a3c9-e0e920b55cb6	593e94bc-b922-4578-a3aa-55c85eff0946	\N	1	Commissione piattaforma 30%: Nina	\N	\N	2026-04-22 10:24:07.522101	Az. Agricola F.lli Gatti	Az. Agricola F.lli Gatti	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
8	adoption_payment	3000	eur	stripe	pi_3TOyHmI4wHZ1JPnl0nNrTmPX	\N	54727c82-ebca-4605-a3c9-e0e920b55cb6	\N	\N	2	Adozione albero: Bonsai	\N	\N	2026-04-22 10:46:04.978181	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
9	platform_commission	900	eur	stripe	pi_3TOyHmI4wHZ1JPnl0nNrTmPX	\N	54727c82-ebca-4605-a3c9-e0e920b55cb6	593e94bc-b922-4578-a3aa-55c85eff0946	\N	2	Commissione piattaforma 30%: Bonsai	\N	\N	2026-04-22 10:46:04.978181	Az. Agricola F.lli Gatti	Az. Agricola F.lli Gatti	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
10	adoption_payment	3000	eur	stripe	pi_3TOyMyI4wHZ1JPnl0OCg8LoR	\N	4ecb752d-4ab2-4d31-93b3-6482a3f7baec	\N	\N	3	Adozione albero: Bonsai	\N	\N	2026-04-22 10:51:34.402609	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
11	platform_commission	900	eur	stripe	pi_3TOyMyI4wHZ1JPnl0OCg8LoR	\N	4ecb752d-4ab2-4d31-93b3-6482a3f7baec	593e94bc-b922-4578-a3aa-55c85eff0946	\N	3	Commissione piattaforma 30%: Bonsai	\N	\N	2026-04-22 10:51:34.402609	Az. Agricola F.lli Gatti	Az. Agricola F.lli Gatti	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
12	adoption_payment	4500	eur	stripe	pi_3TP0eoI4wHZ1JPnl0tmKIG6Q	\N	54727c82-ebca-4605-a3c9-e0e920b55cb6	\N	\N	4	Adozione albero: Hdhdbehdhdh	\N	\N	2026-04-22 13:18:15.431923	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
13	platform_commission	1350	eur	stripe	pi_3TP0eoI4wHZ1JPnl0tmKIG6Q	\N	54727c82-ebca-4605-a3c9-e0e920b55cb6	593e94bc-b922-4578-a3aa-55c85eff0946	\N	4	Commissione piattaforma 30%: Hdhdbehdhdh	\N	\N	2026-04-22 13:18:15.431923	Az. Agricola F.lli Gatti	Az. Agricola F.lli Gatti	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
14	adoption_payment	1000	eur	stripe	pi_3TP0rQI4wHZ1JPnl0ZdnQceg	\N	54727c82-ebca-4605-a3c9-e0e920b55cb6	\N	\N	5	Adozione albero: Fiorello	\N	\N	2026-04-22 13:31:16.014402	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
15	platform_commission	300	eur	stripe	pi_3TP0rQI4wHZ1JPnl0ZdnQceg	\N	54727c82-ebca-4605-a3c9-e0e920b55cb6	593e94bc-b922-4578-a3aa-55c85eff0946	\N	5	Commissione piattaforma 30%: Fiorello	\N	\N	2026-04-22 13:31:16.014402	Az. Agricola F.lli Gatti	Az. Agricola F.lli Gatti	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
16	adoption_payment	3000	eur	stripe	pi_3TP0zvI4wHZ1JPnl0TnEt5Jn	\N	54727c82-ebca-4605-a3c9-e0e920b55cb6	\N	\N	6	Adozione albero: Gino	\N	\N	2026-04-22 13:39:55.776046	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
17	platform_commission	900	eur	stripe	pi_3TP0zvI4wHZ1JPnl0TnEt5Jn	\N	54727c82-ebca-4605-a3c9-e0e920b55cb6	593e94bc-b922-4578-a3aa-55c85eff0946	\N	6	Commissione piattaforma 30%: Gino	\N	\N	2026-04-22 13:39:55.776046	Az. Agricola F.lli Gatti	Az. Agricola F.lli Gatti	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
18	adoption_payment	4500	eur	stripe	pi_3TP1G9I4wHZ1JPnl0fqZQtFN	\N	4ecb752d-4ab2-4d31-93b3-6482a3f7baec	\N	\N	7	Adozione albero: Albino	\N	\N	2026-04-22 13:56:37.048486	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
19	platform_commission	1350	eur	stripe	pi_3TP1G9I4wHZ1JPnl0fqZQtFN	\N	4ecb752d-4ab2-4d31-93b3-6482a3f7baec	593e94bc-b922-4578-a3aa-55c85eff0946	\N	7	Commissione piattaforma 30%: Albino	\N	\N	2026-04-22 13:56:37.048486	Az. Agricola F.lli Gatti	Az. Agricola F.lli Gatti	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
20	adoption_payment	1500	eur	stripe	pi_3TP37VI4wHZ1JPnl0LeqLyWC	\N	4ecb752d-4ab2-4d31-93b3-6482a3f7baec	\N	\N	8	Adozione albero: Hdhdbehdhdh	\N	\N	2026-04-22 15:55:56.604821	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
21	platform_commission	450	eur	stripe	pi_3TP37VI4wHZ1JPnl0LeqLyWC	\N	4ecb752d-4ab2-4d31-93b3-6482a3f7baec	593e94bc-b922-4578-a3aa-55c85eff0946	\N	8	Commissione piattaforma 30%: Hdhdbehdhdh	\N	\N	2026-04-22 15:55:56.604821	Az. Agricola F.lli Gatti	Az. Agricola F.lli Gatti	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
22	campaign_activation	99	eur	stripe	pi_3TSC8wRDrNs5ZPtD05iFZLQz	\N	593e94bc-b922-4578-a3aa-55c85eff0946	593e94bc-b922-4578-a3aa-55c85eff0946	20	\N	Attivazione campagna: Piantala	\N	\N	2026-05-01 08:10:29.408972	Az. Agricola F.lli Gatti	Az. Agricola F.lli Gatti	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
23	campaign_activation	99	eur	stripe	pi_3TSCZ0RDrNs5ZPtD1IPD4x2W	\N	593e94bc-b922-4578-a3aa-55c85eff0946	593e94bc-b922-4578-a3aa-55c85eff0946	21	\N	Attivazione campagna: Piantiamo	\N	\N	2026-05-01 08:37:26.780684	Az. Agricola F.lli Gatti	Az. Agricola F.lli Gatti	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
24	campaign_activation	0	eur	stripe	pi_3TSCiaRDrNs5ZPtD0VyCMl6f	\N	593e94bc-b922-4578-a3aa-55c85eff0946	593e94bc-b922-4578-a3aa-55c85eff0946	22	\N	Attivazione campagna: Orto sociale	\N	\N	2026-05-01 08:47:47.83224	Az. Agricola F.lli Gatti	Az. Agricola F.lli Gatti	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
25	campaign_activation	539	eur	stripe	pi_3TSCndRDrNs5ZPtD1sjJpfHj	\N	593e94bc-b922-4578-a3aa-55c85eff0946	593e94bc-b922-4578-a3aa-55c85eff0946	23	\N	Attivazione campagna: Fruttalo	\N	\N	2026-05-01 08:52:21.540654	Az. Agricola F.lli Gatti	Az. Agricola F.lli Gatti	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
26	campaign_activation	0	eur	discount_100	\N	\N	593e94bc-b922-4578-a3aa-55c85eff0946	593e94bc-b922-4578-a3aa-55c85eff0946	24	\N	Attivazione gratuita campagna (100% sconto): Attivalo	\N	\N	2026-05-01 08:55:32.343476	Az. Agricola F.lli Gatti	Az. Agricola F.lli Gatti	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
27	campaign_activation	99	eur	stripe	pi_3TSCrXRDrNs5ZPtD05TZMfM9	\N	593e94bc-b922-4578-a3aa-55c85eff0946	593e94bc-b922-4578-a3aa-55c85eff0946	25	\N	Attivazione campagna: Test1	\N	\N	2026-05-01 08:56:34.254088	Az. Agricola F.lli Gatti	Az. Agricola F.lli Gatti	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
28	campaign_activation	0	eur	discount_100	\N	\N	593e94bc-b922-4578-a3aa-55c85eff0946	593e94bc-b922-4578-a3aa-55c85eff0946	26	\N	Attivazione gratuita campagna (100% sconto): Hdhhdhhdbdb	\N	\N	2026-05-02 09:34:37.39248	Az. Agricola F.lli Gatti	Az. Agricola F.lli Gatti	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: platform_revenue; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.platform_revenue (id, total_commissions, total_payout_fees, transaction_count, updated_at) FROM stdin;
1	1628	0	15	2026-05-02 09:34:37.401
\.


--
-- Data for Name: policies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.policies (id, type, version, content, is_active, created_at, checkbox_label, consent_note, requires_acceptance, last_modified_at) FROM stdin;
c1e0eab7-0137-4f64-b02a-5bf73293bb11	location	2026-05-04		t	2026-05-04 20:08:15.944813	Acconsento all'utilizzo della mia posizione per migliorare i servizi offerti.	Acconsento all'utilizzo della mia posizione per localizzare gli alberi e migliorare i servizi offerti.	f	2026-05-07 11:22:29.147
042fade4-0ec3-43a9-804f-cb065e832bc9	privacy	v2.0	# Privacy Policy\n\n    Ultimo aggiornamento: 17/06/2026\n\n    Benvenuto/a su TreeShare, una piattaforma social dedicata alla condivisione di alberi piantati e iniziative ambientali. La presente Privacy Policy descrive come raccogliamo, utilizziamo, proteggiamo e trattiamo i tuoi dati personali in conformità al Regolamento (UE) 2016/679 ("GDPR").\n\n    ## 1. Titolare del trattamento\n\n    Il titolare del trattamento dei dati è:\n    Marica Arzu\n    Email: treeshare@treeshareapp.com\n\n    ## 2. Tipologie di dati raccolti\n\n    Raccogliamo le seguenti categorie di dati:\n\n    ### 2.1 Dati forniti dall'utente\n    - Nome e cognome\n    - Email e credenziali di accesso\n    - Contenuti caricati (foto degli alberi, descrizioni, campagne, eventi)\n    - Informazioni relative all'adozione di alberi\n\n    ### 2.2 Dati di geolocalizzazione\n    - Coordinate geografiche degli alberi condivisi\n    - Posizione associata ai contenuti pubblicati (previo consenso)\n\n    ### 2.3 Dati tecnici\n    - Indirizzo IP\n    - Informazioni sul dispositivo\n    - Log di accesso e utilizzo\n\n    ### 2.4 Dati relativi ai pagamenti\n    - Informazioni necessarie per le transazioni (gestite da provider esterni come Stripe e PayPal)\n\n    ### 2.5 Dati delle segnalazioni ambientali (Outdoor)\n    - Coordinate geografiche della posizione della segnalazione\n    - Fotografie caricate dall'utente a corredo della segnalazione\n    - Data e ora della segnalazione\n    - Identificativo dell'account che ha effettuato la segnalazione\n    - Eventuali conferme successive fornite dalla comunità\n\n    ## 3. Finalità del trattamento e base giuridica\n\n    I dati personali sono trattati per le seguenti finalità:\n\n    - Creazione e gestione dell'account → esecuzione del contratto\n    - Condivisione contenuti e funzionalità social → esecuzione del contratto\n    - Geolocalizzazione degli alberi → consenso dell'utente\n    - Gestione delle adozioni e dei servizi a pagamento → esecuzione del contratto\n    - Invio notifiche (accesso, sicurezza, suggerimenti) → legittimo interesse / consenso\n    - Miglioramento della piattaforma e sicurezza → legittimo interesse\n    - Verifica immagini tramite AI → legittimo interesse\n    - Segnalazioni ambientali e territoriali (Outdoor) → esecuzione del contratto / legittimo interesse\n    - Adempimenti legali e fiscali → obbligo legale\n\n    ## 4. Natura del conferimento dei dati\n\n    Il conferimento dei dati è:\n    - Obbligatorio per la creazione dell'account e l'utilizzo della piattaforma\n    - Facoltativo per funzionalità aggiuntive (es. geolocalizzazione)\n\n    Il mancato conferimento dei dati obbligatori impedisce l'utilizzo del servizio.\n\n    ## 5. Servizi di terze parti e ruoli\n\n    La piattaforma utilizza servizi di terze parti:\n\n    - Stripe e PayPal (pagamenti) – titolari autonomi\n    - Supabase (database e autenticazione) – responsabile del trattamento\n    - Cloudinary (gestione immagini) – responsabile del trattamento\n    - Google Maps / Google Earth / Street View – titolari autonomi per i servizi di mappa\n\n    Tali soggetti trattano i dati secondo le proprie privacy policy.\n\n    ## 6. Trasferimento dei dati extra UE\n\n    Alcuni fornitori (es. Google, Stripe, PayPal) possono trasferire dati al di fuori dello Spazio Economico Europeo.\n\n    Tali trasferimenti avvengono nel rispetto del GDPR tramite:\n    - Clausole contrattuali standard (SCC)\n    - Decisioni di adeguatezza della Commissione Europea\n\n    ## 7. Geolocalizzazione\n\n    La geolocalizzazione è attivata solo previo consenso dell'utente.\n    L'utente può disattivarla in qualsiasi momento.\n\n    ## 8. Segnalazioni ambientali e dati di geolocalizzazione\n\n    La Piattaforma consente agli utenti di segnalare problematiche ambientali e territoriali, tra cui, a titolo esemplificativo, alberi caduti, sentieri ostruiti, frane, smottamenti, ponti danneggiati o altri ostacoli che possano interessare escursionisti, ciclisti, utenti outdoor o visitatori del territorio.\n\n    Per l'invio di una segnalazione, la Piattaforma può raccogliere e trattare:\n    - Coordinate geografiche della posizione della segnalazione\n    - Fotografie caricate dall'utente\n    - Data e ora della segnalazione\n    - Identificativo dell'account che ha effettuato la segnalazione\n    - Eventuali conferme successive fornite dalla comunità\n\n    La geolocalizzazione viene utilizzata esclusivamente per consentire l'identificazione del problema segnalato e la sua visualizzazione sulla mappa della Piattaforma.\n\n    Le segnalazioni possono essere visibili agli altri utenti della Piattaforma.\n\n    Le segnalazioni attive vengono conservate fino al verificarsi di una delle seguenti condizioni:\n    - Decorso di 30 giorni dalla pubblicazione della segnalazione\n    - Ricezione di almeno tre conferme da parte di utenti distinti che attestino la non presenza del problema segnalato\n\n    Al verificarsi di una delle condizioni sopra indicate, la segnalazione viene archiviata e non è più mostrata tra le segnalazioni attive. I relativi dati possono essere conservati dal Titolare per finalità statistiche, di sicurezza, di miglioramento del servizio e di gestione della Piattaforma, nel rispetto della normativa applicabile.\n\n    ## 9. Utilizzo dell'intelligenza artificiale (AI)\n\n    La piattaforma utilizza sistemi di intelligenza artificiale per:\n    - Verificare l'autenticità delle immagini\n    - Migliorare la sicurezza e la qualità dei contenuti\n\n    Non vengono adottate decisioni automatizzate con effetti legali o significativi sull'utente.\n\n    ## 10. Conservazione dei dati\n\n    I dati personali sono conservati:\n    - Dati account → per tutta la durata dell'account attivo\n    - Dati tecnici e log → fino a 12 mesi\n    - Dati relativi a obblighi fiscali/contabili → fino a 10 anni\n    - Segnalazioni outdoor attive → fino a 30 giorni dalla pubblicazione o al raggiungimento di 3 conferme di risoluzione; successivamente i dati possono essere conservati per finalità statistiche, di sicurezza e di gestione della Piattaforma\n\n    Al termine, i dati saranno cancellati o anonimizzati.\n\n    ## 11. Condivisione dei dati\n\n    I dati possono essere condivisi con:\n    - Fornitori di servizi tecnologici (vedi sezione 5)\n    - Autorità competenti (obblighi di legge)\n\n    I dati personali NON vengono venduti a terzi.\n\n    ## 12. Diritti dell'utente\n\n    L'utente può esercitare i seguenti diritti:\n    - Accesso ai dati\n    - Rettifica o cancellazione\n    - Limitazione o opposizione al trattamento\n    - Portabilità dei dati\n    - Revoca del consenso\n\n    Inoltre, l'utente ha diritto di proporre reclamo al Garante per la Protezione dei Dati Personali.\n\n    Per esercitare i diritti: treeshare@treeshareapp.com\n\n    ## 13. Sicurezza dei dati\n\n    Adottiamo misure tecniche e organizzative adeguate per proteggere i dati personali.\n\n    ## 14. Cookie e tecnologie simili\n\n    La piattaforma utilizza cookie e strumenti simili.\n    Per maggiori informazioni è disponibile una Cookie Policy dedicata.\n\n    ## 15. Modifiche alla Privacy Policy\n\n    La presente Privacy Policy può essere aggiornata. Le modifiche saranno comunicate tramite la piattaforma.\n\n    ## 16. Contatti\n\n    Per informazioni: treeshare@treeshareapp.com\n\n    Utilizzando la piattaforma, l'utente dichiara di aver letto e compreso la presente Privacy Policy.\n  Sezione disponibile solo in italiano/Section available in Italian only	t	2026-04-10 03:11:10.393059	Dichiaro di aver letto e compreso la Privacy Policy	Dichiaro di aver letto e compreso la Privacy Policy	t	2026-06-17 18:45:42.260069
c0a93a0a-981a-485f-8da3-a50f88b53b3e	terms	2026-06-18	<p>Benvenuto/a su TreeShare, una piattaforma social dedicata alla condivisione di alberi piantati, iniziative ambientali e attività legate alla sostenibilità. L'utilizzo della piattaforma è soggetto ai presenti Termini e Condizioni ("Termini"). Utilizzando il servizio, accetti integralmente quanto segue.</p>\n\n  <section>\n  <h2>1. Oggetto del servizio</h2>\n  <p>La piattaforma consente agli utenti di:</p>\n  <ul>\n  <li>Creare un account personale</li>\n  <li>Condividere foto e informazioni relative agli alberi piantati</li>\n  <li>Visualizzare alberi su mappa geolocalizzata</li>\n  <li>Partecipare e condividere eventi ambientali</li>\n  <li>Accedere a un marketplace per servizi, prodotti e iniziative ambientali</li>\n  <li>Promuovere e aderire a campagne (secondo le condizioni di cui all'art. 11)</li>\n  <li>Adottare alberi (secondo le condizioni di cui all'art. 12)</li>\n  <li>Ricevere notifiche (accessi, consigli, aggiornamenti)</li>\n  </ul>\n  </section>\n\n  <section>\n  <h2>2. Requisiti di età</h2>\n  <p>L'utilizzo della piattaforma è consentito solo a utenti che abbiano compiuto almeno <strong>18 anni</strong>.</p>\n  <p>Registrandosi, l'utente dichiara di possedere tale requisito.</p>\n  </section>\n\n  <section>\n  <h2>3. Registrazione e account</h2>\n  <p>Per utilizzare alcune funzionalità è necessario registrarsi. L'utente si impegna a:</p>\n  <ul>\n  <li>Fornire dati veritieri e aggiornati</li>\n  <li>Mantenere riservate le credenziali</li>\n  <li>Non condividere l'account con terzi</li>\n  </ul>\n  <p>L'utente è responsabile di tutte le attività effettuate tramite il proprio account.</p>\n  </section>\n\n  <section>\n  <h2>4. Utilizzo della piattaforma</h2>\n  <p>L'utente si impegna a utilizzare la piattaforma in modo lecito e rispettoso. È vietato:</p>\n  <ul>\n  <li>Pubblicare contenuti falsi, ingannevoli o non autentici</li>\n  <li>Caricare contenuti offensivi, illegali o dannosi</li>\n  <li>Violare diritti di terzi (copyright, privacy, ecc.)</li>\n  <li>Utilizzare la piattaforma per scopi fraudolenti</li>\n  </ul>\n  </section>\n\n  <section>\n  <h2>5. Contenuti degli utenti</h2>\n  <p>L'utente mantiene la titolarità dei contenuti pubblicati sulla piattaforma. Con il caricamento, concede a TreeShare una <strong>licenza non esclusiva</strong>, gratuita e globale per visualizzare i contenuti sulla piattaforma.</p>\n  <p>I contenuti pubblicati in modalità pubblica sono accessibili a tutti gli utenti registrati. TreeShare può rimuovere contenuti non conformi ai presenti Termini.</p>\n  </section>\n\n  <section>\n  <h2>6. Moderazione dei contenuti e diritto di rimozione</h2>\n  <p>Al fine di garantire il corretto funzionamento della Piattaforma, la sicurezza degli utenti e il rispetto delle presenti Condizioni d'Uso, il Titolare si riserva il diritto, a propria esclusiva discrezione, di esaminare, limitare, oscurare, sospendere o rimuovere qualsiasi contenuto pubblicato dagli utenti che risulti, o sia ragionevolmente ritenuto:</p>\n  <ul>\n  <li>contrario alle presenti Condizioni d'Uso;</li>\n  <li>illecito o in violazione di norme di legge;</li>\n  <li>falso, ingannevole o fraudolento;</li>\n  <li>offensivo, diffamatorio, discriminatorio o lesivo dei diritti di terzi;</li>\n  <li>non pertinente alle finalità della Piattaforma;</li>\n  <li>duplicato, spam o pubblicato con finalità promozionali non autorizzate;</li>\n  <li>idoneo a compromettere il corretto utilizzo della Piattaforma o l'esperienza degli altri utenti.</li>\n  </ul>\n  <p>Il Titolare potrà procedere alla rimozione dei contenuti, alla sospensione temporanea o alla disattivazione dell'account dell'utente responsabile senza obbligo di preavviso, qualora ritenga che il comportamento dell'utente o il contenuto pubblicato possa arrecare danno alla Piattaforma, agli altri utenti o a terzi.</p>\n  <p>La rimozione di contenuti o l'adozione di misure nei confronti di un account non comporta alcun diritto a indennizzi, rimborsi o risarcimenti da parte dell'utente interessato.</p>\n  <p>Il Titolare non è tenuto a monitorare preventivamente tutti i contenuti pubblicati dagli utenti, ma si riserva la facoltà di intervenire in qualsiasi momento qualora venga a conoscenza di possibili violazioni delle presenti Condizioni d'Uso.</p>\n  </section>\n\n  <section>\n  <h2>7. Condivisione su servizi esterni e responsabilità</h2>\n  <h3>Condivisione su piattaforme di terze parti</h3>\n  <p>La piattaforma consente la condivisione di contenuti su servizi di terze parti (es. Facebook) <strong>esclusivamente su iniziativa e richiesta dell'utente</strong>.</p>\n  <h3>Responsabilità dell'utente nella condivisione</h3>\n  <p>L'utente è il <strong>solo responsabile</strong> dei contenuti condivisi, inclusa la loro pubblicazione su piattaforme esterne.</p>\n  <h3>Servizi di terze parti</h3>\n  <p>L'utilizzo di piattaforme esterne è regolato dai termini dei rispettivi fornitori. TreeShare non è responsabile per il funzionamento o le politiche di tali servizi.</p>\n  <h3>Limitazione di responsabilità</h3>\n  <p>TreeShare non è responsabile per eventuali utilizzi impropri dei contenuti da parte degli utenti o di terze parti.</p>\n  </section>\n\n  <section>\n  <h2>8. Verifica dei contenuti (AI)</h2>\n  <p>La piattaforma può utilizzare sistemi di intelligenza artificiale per verificare autenticità e conformità dei contenuti.</p>\n  </section>\n\n  <section>\n  <h2>9. Geolocalizzazione</h2>\n  <p>Alcune funzionalità utilizzano dati di geolocalizzazione. L'utente è responsabile della correttezza dei dati inseriti.</p>\n  </section>\n\n  <section>\n  <h2>10. Pagamenti e servizi di terze parti</h2>\n  <p>I pagamenti sono gestiti da provider esterni (es. Stripe, PayPal).</p>\n  <ul>\n  <li>TreeShare non conserva dati completi di pagamento</li>\n  <li>I pagamenti e i servizi di terze parti sono soggetti ai termini dei rispettivi provider</li>\n  <li>TreeShare seleziona partner affidabili nel rispetto della normativa applicabile</li>\n  </ul>\n  </section>\n\n  <section>\n  <h2>11. Campagne (utenti con Partita IVA)</h2>\n  <p>La creazione di campagne è riservata a utenti con Partita IVA. L'utente è responsabile di contenuti, gestione economica e conformità normativa. TreeShare non è parte delle transazioni.</p>\n  </section>\n\n  <section>\n  <h2>12. Adozione alberi (utenti con Partita IVA)</h2>\n  <p>Solo utenti con Partita IVA possono proporre alberi in adozione. Il proponente è responsabile dell'esistenza degli alberi, delle informazioni fornite e della gestione dell'adozione. TreeShare è solo intermediario tecnologico.</p>\n  </section>\n\n  <section>\n  <h2>13. Limitazione responsabilità su prodotti</h2>\n  <ul>\n  <li>TreeShare non è responsabile per spedizione o qualità dei prodotti</li>\n  <li>I beni alimentari non sono rimborsabili salvo difetti (rotti/scaduti)</li>\n  <li>Non sono previsti cambi o rimborsi salvo obblighi di legge</li>\n  </ul>\n  </section>\n\n  <section>\n  <h2>14. Limitazione responsabilità su eventi e campagne</h2>\n  <p>TreeShare non organizza né controlla eventi o campagne. La partecipazione avviene sotto responsabilità dell'utente. TreeShare non è responsabile per danni, incidenti o controversie.</p>\n  </section>\n\n  <section>\n  <h2>15. Diritto di recesso</h2>\n  <p>Ai sensi della normativa UE:</p>\n  <ul>\n  <li>Il diritto di recesso può non applicarsi a contenuti digitali già fruiti</li>\n  <li>Non si applica a beni alimentari deperibili</li>\n  </ul>\n  </section>\n\n  <section>\n  <h2>16. Servizio fornito "così com'è"</h2>\n  <p>La piattaforma è fornita <strong>"così com'è"</strong> senza garanzie di continuità, affidabilità o assenza di errori.</p>\n  </section>\n\n  <section>\n  <h2>17. Sospensione e interruzione del servizio</h2>\n  <p>TreeShare può sospendere account o interrompere il servizio in qualsiasi momento, senza obbligo di indennizzo.</p>\n  </section>\n\n  <section>\n  <h2>18. Manleva</h2>\n  <p>L'utente si impegna a manlevare TreeShare da qualsiasi responsabilità derivante da uso improprio della piattaforma, violazioni di legge, e contenuti pubblicati o condivisi su piattaforme esterne.</p>\n  </section>\n\n  <section>\n  <h2>19. Dati e responsabilità utenti business</h2>\n  <p>Gli utenti con Partita IVA agiscono come titolari autonomi dei dati trattati nell'ambito delle loro attività.</p>\n  </section>\n\n  <section>\n  <h2>20. Trasferimento dati</h2>\n  <p>Alcuni servizi possono comportare trasferimento di dati fuori dall'Unione Europea.</p>\n  </section>\n\n  <section>\n  <h2>21. Proprietà intellettuale</h2>\n  <p>Tutti i diritti sulla piattaforma appartengono a TreeShareapp.</p>\n  </section>\n\n  <section>\n  <h2>22. Modello di business</h2>\n  <p>La piattaforma può generare ricavi attraverso servizi a pagamento, commissioni sulle transazioni e attività promozionali con soggetti terzi selezionati, nel rispetto della normativa applicabile.</p>\n  </section>\n\n  <section>\n  <h2>23. Limitazione sull'uso dei dati</h2>\n  <p>I dati personali degli utenti sono trattati in conformità al <strong>GDPR</strong> e alle disposizioni della Privacy Policy di TreeShare. I dati non vengono ceduti a terzi in modo incompatibile con le finalità ivi indicate. Per maggiori informazioni consulta la <a href="/privacy">Privacy Policy</a>.</p>\n  </section>\n\n  <section>\n  <h2>24. Classifiche, ranking e indicatori ambientali</h2>\n  <p>La piattaforma genera classifiche e statistiche basate sulle attività degli utenti (es. classifica CO₂ per comuni). Tali classifiche hanno finalità informative ed educative, si basano su modelli di calcolo stimati e non certificati. TreeShare non garantisce l'accuratezza scientifica dei dati ambientali né la loro utilizzabilità per certificazioni o crediti di carbonio.</p>\n  </section>\n\n  <section>\n  <h2>25. Dichiarazioni ambientali (Green Claims)</h2>\n  <p>Le informazioni e metriche ambientali hanno finalità informative e divulgative. Non costituiscono dichiarazioni ambientali certificate e non devono essere utilizzate per finalità commerciali o legali senza adeguata verifica indipendente. L'utente è l'unico responsabile dell'eventuale utilizzo di tali informazioni al di fuori della piattaforma.</p>\n  </section>\n\n  <section>\n  <h2>26. Modifiche ai Termini</h2>\n  <p>I Termini possono essere modificati in qualsiasi momento.</p>\n  </section>\n\n  <section>\n  <h2>27. Legge applicabile</h2>\n  <p>Legge italiana – Foro competente: Cuneo.</p>\n  </section>\n\n  <section>\n  <h2>28. Contatti</h2>\n  <p>Email: <a href="mailto:treeshare@treeshareapp.com">treeshare@treeshareapp.com</a></p>\n  </section>	t	2026-05-04 19:45:24.594485	Ho letto e accetto i Termini e Condizioni	Ho letto e accetto i Termini e Condizioni	t	2026-06-17 18:50:20.915481
1d504166-48ff-4ce0-b52e-3ebc6b0b1b09	privacy	2026-05-02	<p>Benvenuto/a su TreeShare, una piattaforma social dedicata alla condivisione di alberi piantati e iniziative ambientali. La presente Privacy Policy descrive come raccogliamo, utilizziamo, proteggiamo e trattiamo i tuoi dati personali in conformità al Regolamento (UE) 2016/679 ("GDPR").</p>\n\n<section>\n<h2>1. Titolare del trattamento</h2>\n<p>Il titolare del trattamento dei dati è:<br><strong>Marica Arzu</strong><br>Email: <a href="mailto:treeshare@treeshareapp.com">treeshare@treeshareapp.com</a></p>\n</section>\n\n<section>\n<h2>2. Tipologie di dati raccolti</h2>\n<h3>2.1 Dati forniti dall'utente</h3>\n<ul>\n<li>Nome e cognome</li>\n<li>Email e credenziali di accesso</li>\n<li>Contenuti caricati (foto degli alberi, descrizioni, campagne, eventi)</li>\n<li>Informazioni relative all'adozione di alberi</li>\n</ul>\n<h3>2.2 Dati di geolocalizzazione</h3>\n<ul>\n<li>Coordinate geografiche degli alberi condivisi</li>\n<li>Posizione associata ai contenuti pubblicati (previo consenso)</li>\n</ul>\n<h3>2.3 Dati tecnici</h3>\n<ul>\n<li>Indirizzo IP</li>\n<li>Informazioni sul dispositivo</li>\n<li>Log di accesso e utilizzo</li>\n</ul>\n<h3>2.4 Dati relativi ai pagamenti</h3>\n<ul>\n<li>Informazioni necessarie per le transazioni (gestite da provider esterni come Stripe e PayPal)</li>\n</ul>\n</section>\n\n<section>\n<h2>3. Finalità del trattamento e base giuridica</h2>\n<p>I dati personali sono trattati per le seguenti finalità:</p>\n<table>\n<thead><tr><th>Finalità</th><th>Base giuridica</th></tr></thead>\n<tbody>\n<tr><td>Creazione e gestione dell'account</td><td>esecuzione del contratto</td></tr>\n<tr><td>Condivisione contenuti e funzionalità social</td><td>esecuzione del contratto</td></tr>\n<tr><td>Marketplace e interazioni fra utenti</td><td>esecuzione del contratto</td></tr>\n<tr><td>Condivisione su piattaforme di terze parti (es. Facebook)</td><td>consenso dell'utente</td></tr>\n<tr><td>Marketing e comunicazioni promozionali</td><td>consenso esplicito</td></tr>\n<tr><td>Geolocalizzazione degli alberi</td><td>consenso dell'utente</td></tr>\n<tr><td>Gestione delle adozioni e dei servizi a pagamento</td><td>esecuzione del contratto</td></tr>\n<tr><td>Invio notifiche</td><td>legittimo interesse / consenso</td></tr>\n<tr><td>Miglioramento della piattaforma e sicurezza</td><td>legittimo interesse</td></tr>\n<tr><td>Verifica immagini tramite AI</td><td>legittimo interesse</td></tr>\n<tr><td>Generazione di classifiche e statistiche ambientali territoriali</td><td>legittimo interesse</td></tr>\n<tr><td>Adempimenti legali e fiscali</td><td>obbligo legale</td></tr>\n</tbody>\n</table>\n</section>\n\n<section>\n<h2>4. Natura del conferimento dei dati</h2>\n<p>Il conferimento dei dati è:</p>\n<ul>\n<li><strong>Obbligatorio</strong> per la creazione dell'account e l'utilizzo della piattaforma</li>\n<li><strong>Facoltativo</strong> per funzionalità aggiuntive (es. geolocalizzazione)</li>\n</ul>\n<p>Il mancato conferimento dei dati obbligatori impedisce l'utilizzo del servizio.</p>\n</section>\n\n<section>\n<h2>5. Servizi di terze parti e ruoli</h2>\n<p>La piattaforma utilizza i seguenti servizi di terze parti:</p>\n<table>\n<thead><tr><th>Fornitore</th><th>Finalità</th><th>Ruolo</th></tr></thead>\n<tbody>\n<tr><td>Stripe e PayPal</td><td>pagamenti</td><td>titolari autonomi</td></tr>\n<tr><td>Supabase</td><td>database e autenticazione</td><td>responsabile del trattamento</td></tr>\n<tr><td>Cloudinary</td><td>gestione immagini</td><td>responsabile del trattamento</td></tr>\n<tr><td>Google Maps / Google Earth / Street View</td><td>servizi di mappa</td><td>titolari autonomi</td></tr>\n<tr><td>Meta Platforms Inc. (Facebook)</td><td>condivisione social su iniziativa dell'utente</td><td>titolare autonomo</td></tr>\n</tbody>\n</table>\n<p>Tali soggetti trattano i dati secondo le proprie privacy policy.</p>\n</section>\n\n<section>\n<h2>6. Condivisione su piattaforme social di terze parti</h2>\n<p>L'utente può scegliere di condividere contenuti tramite servizi di terze parti, come Facebook. La condivisione avviene <strong>esclusivamente su iniziativa dell'utente</strong>. Non vengono effettuate condivisioni automatiche. Le piattaforme di terze parti operano come <strong>titolari autonomi del trattamento</strong> dei dati.</p>\n</section>\n\n<section>\n<h2>7. Trasferimento dei dati extra UE</h2>\n<p>Alcuni fornitori (es. Google, Stripe, PayPal, Meta) possono trasferire dati al di fuori dello Spazio Economico Europeo. Tali trasferimenti avvengono nel rispetto del GDPR tramite clausole contrattuali standard (SCC) o decisioni di adeguatezza della Commissione Europea.</p>\n</section>\n\n<section>\n<h2>8. Geolocalizzazione</h2>\n<p>La geolocalizzazione è attivata solo previo consenso dell'utente. L'utente può disattivarla in qualsiasi momento.</p>\n</section>\n\n<section>\n<h2>9. Classifiche, statistiche ambientali e calcolo CO₂</h2>\n<p>La piattaforma elabora dati relativi alle attività degli utenti per generare statistiche ambientali e classifiche territoriali (es. classifica CO₂ per comuni). Tali elaborazioni sono effettuate su base aggregata, hanno finalità di sensibilizzazione ambientale e possono essere rese pubbliche. Il calcolo della CO₂ è basato su modelli stimati e non rappresenta una misurazione scientifica certificata.</p>\n<p><em>Non vengono adottate decisioni automatizzate con effetti legali o significativi sugli utenti.</em></p>\n</section>\n\n<section>\n<h2>10. Utilizzo dell'intelligenza artificiale (AI)</h2>\n<p>La piattaforma utilizza sistemi di intelligenza artificiale per:</p>\n<ul>\n<li>Verificare l'autenticità delle immagini</li>\n<li>Migliorare la sicurezza e la qualità dei contenuti</li>\n</ul>\n<p><em>Non vengono adottate decisioni automatizzate con effetti legali o significativi sull'utente.</em></p>\n</section>\n\n<section>\n<h2>11. Conservazione dei dati</h2>\n<table>\n<thead><tr><th>Categoria</th><th>Periodo di conservazione</th></tr></thead>\n<tbody>\n<tr><td>Dati account</td><td>Per tutta la durata dell'account attivo</td></tr>\n<tr><td>Dati tecnici e log</td><td>Fino a 12 mesi</td></tr>\n<tr><td>Dati relativi a obblighi fiscali/contabili</td><td>Fino a 10 anni</td></tr>\n</tbody>\n</table>\n<p>Al termine, i dati saranno cancellati o anonimizzati.</p>\n</section>\n\n<section>\n<h2>12. Condivisione dei dati e partner</h2>\n<p>I dati possono essere condivisi con:</p>\n<ul>\n<li>Fornitori di servizi tecnologici (vedi sezione 5)</li>\n<li>Partner selezionati che supportano l'erogazione del servizio</li>\n<li>Autorità competenti (obblighi di legge)</li>\n</ul>\n<p>Previo <strong>consenso esplicito</strong>, i dati possono essere utilizzati per l'invio di comunicazioni promozionali. I dati personali identificabili <strong>non vengono ceduti a terzi</strong> in modo incompatibile con le finalità indicate.</p>\n</section>\n\n<section>\n<h2>13. Diritti dell'utente</h2>\n<p>L'utente può esercitare i seguenti diritti:</p>\n<ul>\n<li>Accesso ai dati</li>\n<li>Rettifica o cancellazione</li>\n<li>Limitazione o opposizione al trattamento</li>\n<li>Portabilità dei dati</li>\n<li>Revoca del consenso</li>\n</ul>\n<p>L'utente ha diritto di proporre reclamo al <strong>Garante per la Protezione dei Dati Personali</strong>.</p>\n<p>Per esercitare i diritti: <a href="mailto:treeshare@treeshareapp.com">treeshare@treeshareapp.com</a></p>\n</section>\n\n<section>\n<h2>14. Sicurezza dei dati</h2>\n<p>Adottiamo misure tecniche e organizzative adeguate per proteggere i dati personali.</p>\n</section>\n\n<section>\n<h2>15. Cookie e tecnologie simili</h2>\n<p>La piattaforma utilizza cookie e strumenti simili. Per maggiori informazioni è disponibile una <a href="/cookies">Cookie Policy</a> dedicata.</p>\n</section>\n\n<section>\n<h2>16. Modifiche alla Privacy Policy</h2>\n<p>La presente Privacy Policy può essere aggiornata. Le modifiche saranno comunicate tramite la piattaforma.</p>\n</section>\n\n<section>\n<h2>17. Contatti</h2>\n<p>Per informazioni: <a href="mailto:treeshare@treeshareapp.com">treeshare@treeshareapp.com</a></p>\n</section>	f	2026-05-04 19:45:24.611156	\N	\N	t	\N
5afbeaae-0d84-4d0e-a289-c9fbe872ed2a	cookie	2026-05-02	<p>La presente Cookie Policy descrive come TreeShare utilizza i cookie e tecnologie di tracciamento simili quando accedi alla piattaforma.</p>\n\n<section>\n<h2>1. Cosa sono i cookie</h2>\n<p>I cookie sono piccoli file di testo che un sito web invia al tuo browser e che vengono memorizzati sul tuo dispositivo. Oltre ai cookie tradizionali, utilizziamo tecnologie simili come il localStorage e il sessionStorage del browser per conservare informazioni di sessione necessarie al corretto funzionamento dell'applicazione.</p>\n</section>\n\n<section>\n<h2>2. Tipologie di cookie utilizzati</h2>\n<h3>2.1 Cookie tecnici / strettamente necessari</h3>\n<p>Questi cookie sono indispensabili per il funzionamento della piattaforma e non possono essere disabilitati senza compromettere il servizio. Non richiedono il consenso preventivo. Includono: cookie di sessione per l'autenticazione, token di sicurezza, preferenze di lingua e tema.</p>\n<h3>2.2 Cookie funzionali</h3>\n<p>Questi cookie migliorano l'esperienza d'uso memorizzando le tue scelte (es. lingua preferita, tema chiaro/scuro). Possono essere disabilitati, ma ciò potrebbe comportare la perdita di alcune funzionalità personalizzate.</p>\n<h3>2.3 Cookie di terze parti</h3>\n<p>Alcuni servizi di terze parti integrati nella piattaforma possono impostare i propri cookie. TreeShare non ha controllo diretto su questi cookie. Ti invitiamo a consultare le rispettive privacy/cookie policy.</p>\n</section>\n\n<section>\n<h2>3. Cookie e tecnologie specifiche utilizzate</h2>\n<table>\n<thead><tr><th>Nome / Tecnologia</th><th>Fornitore</th><th>Finalità</th><th>Durata</th></tr></thead>\n<tbody>\n<tr><td><code>sb-*-auth-token</code></td><td>Supabase</td><td>Gestione sessione di autenticazione dell'utente</td><td>Sessione / 1 settimana</td></tr>\n<tr><td><code>localStorage (theme)</code></td><td>TreeShare</td><td>Memorizzazione preferenza tema (chiaro/scuro)</td><td>Persistente</td></tr>\n<tr><td><code>localStorage (lang)</code></td><td>TreeShare</td><td>Memorizzazione lingua preferita</td><td>Persistente</td></tr>\n<tr><td><code>__stripe_mid / __stripe_sid</code></td><td>Stripe</td><td>Prevenzione frodi e sicurezza nei pagamenti</td><td>1 anno / Sessione</td></tr>\n<tr><td><code>sessionStorage (draft)</code></td><td>TreeShare</td><td>Salvataggio temporaneo bozze post durante la sessione</td><td>Sessione</td></tr>\n</tbody>\n</table>\n<p>L'elenco sopra è indicativo e potrebbe non essere esaustivo.</p>\n</section>\n\n<section>\n<h2>4. Cookie di Supabase (autenticazione)</h2>\n<p>TreeShare utilizza Supabase come sistema di autenticazione. Supabase imposta cookie e voci di localStorage per gestire la sessione autenticata dell'utente. Per maggiori informazioni, consulta la <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy di Supabase</a>.</p>\n</section>\n\n<section>\n<h2>5. Cookie di Stripe (pagamenti)</h2>\n<p>Quando utilizzi le funzionalità di pagamento, Stripe può impostare cookie propri a finalità antifrode e di sicurezza delle transazioni. Questi cookie non vengono usati per profilazione commerciale. Per maggiori informazioni, consulta la <a href="https://stripe.com/en-it/privacy" target="_blank" rel="noopener noreferrer">Cookie Policy di Stripe</a>.</p>\n</section>\n\n<section>\n<h2>6. Assenza di cookie di profilazione e marketing</h2>\n<p>TreeShare <strong>non utilizza</strong> cookie di profilazione, cookie pubblicitari o strumenti di tracciamento a fini di marketing (es. Google Analytics, Facebook Pixel, o simili). Non viene effettuata alcuna attività di remarketing o pubblicità comportamentale.</p>\n</section>\n\n<section>\n<h2>7. Come gestire i cookie</h2>\n<p>Puoi controllare e gestire i cookie direttamente dalle impostazioni del tuo browser:</p>\n<ul>\n<li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>\n<li><a href="https://support.mozilla.org/it/kb/Attivare%20e%20disattivare%20i%20cookie" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>\n<li><a href="https://support.apple.com/it-it/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">Apple Safari</a></li>\n<li><a href="https://support.microsoft.com/it-it/topic/eliminare-e-gestire-i-cookie-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>\n</ul>\n<p>La disabilitazione dei cookie tecnici potrebbe compromettere il funzionamento della piattaforma.</p>\n</section>\n\n<section>\n<h2>8. Durata dei cookie</h2>\n<p><strong>Cookie di sessione:</strong> vengono eliminati automaticamente alla chiusura del browser.</p>\n<p><strong>Cookie persistenti:</strong> rimangono memorizzati sul tuo dispositivo per un periodo definito (indicato nella tabella al punto 3) o fino alla loro eliminazione manuale.</p>\n</section>\n\n<section>\n<h2>9. Base giuridica del trattamento</h2>\n<p>Il trattamento dei dati tramite cookie tecnici è fondato sul legittimo interesse del titolare al corretto funzionamento del servizio (art. 6, par. 1, lett. f del GDPR) e, ai sensi dell'art. 122 del D.lgs. 196/2003, non richiede il consenso preventivo dell'utente.</p>\n<p>Non utilizziamo cookie che richiedono consenso preventivo (es. cookie di profilazione o marketing).</p>\n</section>\n\n<section>\n<h2>10. Aggiornamenti della Cookie Policy</h2>\n<p>Questa Cookie Policy può essere aggiornata periodicamente per riflettere modifiche tecniche, normative o organizzative. La data dell'ultimo aggiornamento è indicata in cima al documento.</p>\n</section>\n\n<section>\n<h2>11. Contatti</h2>\n<p><strong>Marica Arzu — TreeShare</strong><br>Email: <a href="mailto:treeshare@treeshareapp.com">treeshare@treeshareapp.com</a></p>\n</section>	t	2026-05-04 19:45:24.620065	\N	\N	t	\N
831f11bb-3eb1-45b9-a3ae-0a1f0f41d0b5	terms	v2.0	# Termini e Condizioni di Utilizzo\n\n  Ultimo aggiornamento: 20/04/2026\n\n  Benvenuto/a su TreeShare, una piattaforma social dedicata alla condivisione di alberi piantati, iniziative ambientali e attività legate alla sostenibilità.\n\n  L'utilizzo della piattaforma è soggetto ai presenti Termini e Condizioni ("Termini"). Utilizzando il servizio, accetti integralmente quanto segue.\n\n  ## 1. Oggetto del servizio\n\n  La piattaforma consente agli utenti di:\n  - Creare un account personale\n  - Condividere foto e informazioni relative agli alberi piantati\n  - Visualizzare alberi su mappa geolocalizzata\n  - Partecipare e condividere eventi ambientali\n  - Promuovere e aderire a campagne (secondo le condizioni di cui all'art. 8)\n  - Adottare alberi (secondo le condizioni di cui all'art. 9)\n  - Ricevere notifiche (accessi, consigli, aggiornamenti)\n\n  ## 2. Requisiti di età\n\n  L'utilizzo della piattaforma è consentito solo a utenti che abbiano compiuto almeno 18 anni.\n  Registrandosi, l'utente dichiara di possedere tale requisito.\n\n  ## 3. Registrazione e account\n\n  Per utilizzare alcune funzionalità è necessario registrarsi.\n\n  L'utente si impegna a:\n  - Fornire dati veritieri e aggiornati\n  - Mantenere riservate le credenziali\n  - Non condividere l'account con terzi\n\n  L'utente è responsabile di tutte le attività effettuate tramite il proprio account.\n\n  ## 4. Utilizzo della piattaforma\n\n  L'utente si impegna a utilizzare la piattaforma in modo lecito e rispettoso.\n\n  È vietato:\n  - Pubblicare contenuti falsi, ingannevoli o non autentici\n  - Caricare contenuti offensivi, illegali o dannosi\n  - Violare diritti di terzi (copyright, privacy, ecc.)\n  - Utilizzare la piattaforma per scopi fraudolenti\n\n  ## 5. Contenuti degli utenti\n\n  L'utente mantiene la proprietà dei contenuti pubblicati.\n\n  Con il caricamento, concede a TreeShare una licenza non esclusiva, gratuita e globale per l'utilizzo dei contenuti sulla piattaforma.\n\n  TreeShare può rimuovere contenuti, anche senza preavviso, qualora ritenuti non conformi.\n\n  ## 6. Verifica dei contenuti (AI)\n\n  La piattaforma può utilizzare sistemi di intelligenza artificiale per verificare autenticità e conformità dei contenuti.\n\n  ## 7. Geolocalizzazione\n\n  Alcune funzionalità utilizzano dati di geolocalizzazione. L'utente è responsabile della correttezza dei dati inseriti.\n\n  ## 8. Pagamenti\n\n  I pagamenti sono gestiti da provider esterni (es. Stripe, PayPal).\n  - TreeShare non conserva dati completi di pagamento\n  - I pagamenti sono soggetti ai termini dei provider\n\n  ## 9. Campagne (utenti con Partita IVA)\n\n  La creazione di campagne è riservata a utenti con Partita IVA.\n\n  L'utente è responsabile di:\n  - Contenuti\n  - Gestione economica\n  - Conformità normativa\n\n  TreeShare non è parte delle transazioni.\n\n  ## 10. Adozione alberi (utenti con Partita IVA)\n\n  Solo utenti con Partita IVA possono proporre alberi in adozione.\n\n  Il proponente è responsabile di:\n  - Esistenza degli alberi\n  - Informazioni fornite\n  - Gestione dell'adozione\n\n  TreeShare è solo intermediario tecnologico.\n\n  ## 11. Limitazione responsabilità su prodotti\n\n  - TreeShare non è responsabile per spedizione o qualità dei prodotti\n  - I beni alimentari non sono rimborsabili salvo difetti (rotti/scaduti)\n  - Non sono previsti cambi o rimborsi salvo obblighi di legge\n\n  ## 12. Limitazione responsabilità su eventi e campagne\n\n  TreeShare non organizza né controlla eventi o campagne.\n\n  La partecipazione avviene sotto responsabilità dell'utente.\n\n  TreeShare non è responsabile per danni, incidenti o controversie.\n\n  ## 13. Diritto di recesso\n\n  Ai sensi della normativa UE:\n  - Il diritto di recesso può non applicarsi a contenuti digitali già fruiti\n  - Non si applica a beni alimentari deperibili\n\n  ## 14. Servizio fornito "così com'è"\n\n  La piattaforma è fornita "così com'è" senza garanzie di continuità, affidabilità o assenza di errori.\n\n  ## 15. Sospensione e interruzione del servizio\n\n  TreeShare può:\n  - Sospendere account senza preavviso\n  - Interrompere il servizio in qualsiasi momento\n\n  Senza obbligo di indennizzo.\n\n  ## 16. Manleva\n\n  L'utente si impegna a manlevare TreeShare da qualsiasi responsabilità derivante da:\n  - Uso improprio della piattaforma\n  - Violazioni di legge\n  - Contenuti pubblicati\n\n  ## 17. Dati e responsabilità utenti business\n\n  Gli utenti con Partita IVA agiscono come titolari autonomi dei dati trattati nell'ambito delle loro attività.\n\n  ## 18. Trasferimento dati\n\n  Alcuni servizi possono comportare trasferimento di dati fuori dall'Unione Europea.\n\n  ## 19. Proprietà intellettuale\n\n  Tutti i diritti sulla piattaforma appartengono a TreeShare.\n\n  ## 20. Modifiche ai Termini\n\n  I Termini possono essere modificati in qualsiasi momento.\n\n  ## 21. Legge applicabile\n\n  Legge italiana – Foro competente: Cuneo\n\n  ## 22. Contatti\n\n  Email: treeshare@treeshareapp.com\n\n  Utilizzando la piattaforma, l'utente dichiara di aver letto e accettato i presenti Termini.	f	2026-04-10 03:11:28.44545	Ho letto e accetto i Termini e Condizioni	\N	t	\N
e1dbb84c-cf68-4772-9629-e49810aa9ee5	marketing	2026-05-04		t	2026-05-04 19:29:42.018575	Acconsento a ricevere notifiche promozionali e comunicazioni commerciali e all'analisi delle mie preferenze e attività per ricevere suggerimenti personalizzati.	Acconsento a ricevere notifiche promozionali e comunicazioni commerciali e all'analisi delle mie preferenze e attività per ricevere suggerimenti personalizzati.	f	2026-05-07 11:12:10.183
\.


--
-- Data for Name: problem_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.problem_reports (id, user_id, username, category, description, status, admin_note, replied_at, reply_text, created_at) FROM stdin;
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reports (id, reporter_user_id, reported_user_id, reported_username, tree_id, event_id, event_title, reason, notes, status, created_at, tree_update_id) FROM stdin;
6	4ecb752d-4ab2-4d31-93b3-6482a3f7baec	54727c82-ebca-4605-a3c9-e0e920b55cb6	Marikina	19	\N	\N	contenuto_falso	\N	reviewed	2026-04-29 13:56:12.001025	\N
7	4ecb752d-4ab2-4d31-93b3-6482a3f7baec	54727c82-ebca-4605-a3c9-e0e920b55cb6	Marikina	19	\N	\N	foto_non_vegetale	\N	dismissed	2026-04-29 13:57:15.654802	\N
8	4ecb752d-4ab2-4d31-93b3-6482a3f7baec	54727c82-ebca-4605-a3c9-e0e920b55cb6	Marikina	19	\N	\N	foto_non_vegetale	\N	reviewed	2026-04-29 13:58:05.413681	\N
\.


--
-- Data for Name: tips; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tips (id, title, description, category, created_at, updated_at, image_url) FROM stdin;
50	Lo sapevi che...?!	Se applichi il decotto di ortiche sulla cute del capello ne favorisce la crescita?!	general	2026-04-28 17:20:40.040202	2026-04-28 17:21:03.382	/objects/uploads/89389019-d900-4d6b-9871-8cc75b95f929.png
51	Lo sapevi che...?!	La celidonia (Chelidonium Majus) è anche chiamata erba dei porri grazie alla sue proprietà antisettiche e dermopurificanti?\nInfatti, spezzandone lo stelo, fuorisce una lattice giallo che, applicato su porri, verruche o calli, ne favorisce l'eliminazione.\nSi raccomanda solo l'uso esterno data l'elevata tossicità di alcuni principi.	general	2026-04-29 08:22:37.040616	2026-04-29 08:37:28.862	/objects/uploads/62d35688-f24b-4f74-91d2-97d702250141.jpg
\.


--
-- Data for Name: trail_report_confirmations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.trail_report_confirmations (id, report_id, user_id, type, created_at) FROM stdin;
\.


--
-- Data for Name: trail_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.trail_reports (id, user_id, type, description, latitude, longitude, location_name, status, archived_at, archived_reason, created_at, photo_url) FROM stdin;
3	54727c82-ebca-4605-a3c9-e0e920b55cb6	garbage	\N	44.46425	7.674965	\N	active	\N	\N	2026-06-17 12:29:38.921394	/objects/uploads/b29bbcab-9b8e-41aa-a216-9c5bb0fcae61.jpg
4	54727c82-ebca-4605-a3c9-e0e920b55cb6	path_interrupted	\N	44.39362	7.518586	\N	active	\N	\N	2026-06-17 18:28:14.704404	/objects/uploads/134d8bc5-e761-428e-bd32-5871f74427cf.jpg
\.


--
-- Data for Name: tree_adoptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tree_adoptions (id, user_id, tree_id, tree_name, duration_days, start_date, end_date, amount_cents, platform_fee_cents, net_to_entity_cents, stripe_payment_intent_id, status, expiry_notified_at, created_at, adoption_code, org_status, shipping_data, user_name, user_phone) FROM stdin;
1	54727c82-ebca-4605-a3c9-e0e920b55cb6	40	Nina	180	2026-04-22 10:24:07.523	2026-10-19 21:59:00	12000	3600	8400	pi_3TOxwHI4wHZ1JPnl0kEotKuW	active	\N	2026-04-22 10:24:07.522101	ADO-E8EFEBFF	\N	\N	\N	\N
4	54727c82-ebca-4605-a3c9-e0e920b55cb6	41	Hdhdbehdhdh	90	2026-04-22 13:18:15.433	2026-07-21 21:59:00	4500	1350	3150	pi_3TP0eoI4wHZ1JPnl0tmKIG6Q	active	\N	2026-04-22 13:18:15.431923	ADO-3BA860DE	shipped	\N	\N	\N
7	4ecb752d-4ab2-4d31-93b3-6482a3f7baec	39	Albino	90	2026-04-22 13:56:37.05	2026-07-21 21:59:00	4500	1350	3150	pi_3TP1G9I4wHZ1JPnl0fqZQtFN	active	\N	2026-04-22 13:56:37.048486	ADO-CE9F1129	\N	\N	\N	\N
2	54727c82-ebca-4605-a3c9-e0e920b55cb6	42	Bonsai	30	2026-04-22 10:46:04.979	2026-05-22 21:59:00	3000	900	2100	pi_3TOyHmI4wHZ1JPnl0nNrTmPX	expired	\N	2026-04-22 10:46:04.978181	ADO-BC790800	\N	\N	\N	\N
3	4ecb752d-4ab2-4d31-93b3-6482a3f7baec	42	Bonsai	30	2026-04-22 10:51:34.403	2026-05-22 21:59:00	3000	900	2100	pi_3TOyMyI4wHZ1JPnl0OCg8LoR	expired	\N	2026-04-22 10:51:34.402609	ADO-7C0997D2	\N	\N	\N	\N
6	54727c82-ebca-4605-a3c9-e0e920b55cb6	38	Gino	30	2026-04-22 13:39:55.777	2026-05-22 21:59:00	3000	900	2100	pi_3TP0zvI4wHZ1JPnl0TnEt5Jn	expired	\N	2026-04-22 13:39:55.776046	ADO-BBC9A2EA	shipping_received	\N	\N	\N
5	54727c82-ebca-4605-a3c9-e0e920b55cb6	37	Fiorello	30	2026-04-22 13:31:16.015	2026-05-22 21:59:00	1000	300	700	pi_3TP0rQI4wHZ1JPnl0ZdnQceg	expired	\N	2026-04-22 13:31:16.014402	ADO-AC0FE166	shipping_received	\N	\N	\N
8	4ecb752d-4ab2-4d31-93b3-6482a3f7baec	41	Hdhdbehdhdh	30	2026-04-22 15:55:56.606	2026-05-22 21:59:00	1500	450	1050	pi_3TP37VI4wHZ1JPnl0LeqLyWC	expired	\N	2026-04-22 15:55:56.604821	ADO-060DFFA9	\N	\N	\N	\N
\.


--
-- Data for Name: tree_status_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tree_status_reports (id, tree_id, quarter, status, photo_url, reported_at, photo_status) FROM stdin;
1	18	2026-Q2	dead	\N	2026-05-02 04:22:03.795473	pending
2	16	2026-Q2	dead	\N	2026-05-02 04:40:31.233986	pending
\.


--
-- Data for Name: tree_suns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tree_suns (id, tree_id, user_id, created_at) FROM stdin;
17	15	54727c82-ebca-4605-a3c9-e0e920b55cb6	2026-04-15 19:02:15.527439
18	15	593e94bc-b922-4578-a3aa-55c85eff0946	2026-04-15 19:07:19.656072
54	17	593e94bc-b922-4578-a3aa-55c85eff0946	2026-04-18 10:25:18.106689
62	17	54727c82-ebca-4605-a3c9-e0e920b55cb6	2026-04-18 10:25:30.261601
67	16	54727c82-ebca-4605-a3c9-e0e920b55cb6	2026-04-23 10:00:00
68	17	54727c82-ebca-4605-a3c9-e0e920b55cb6	2026-04-24 10:00:00
69	16	4ecb752d-4ab2-4d31-93b3-6482a3f7baec	2026-04-27 16:53:47.017513
70	16	86fe9024-a29e-4d5c-8c09-a152f22b1e93	2026-04-27 16:54:08.079215
73	21	54727c82-ebca-4605-a3c9-e0e920b55cb6	2026-05-03 15:18:27.829188
75	23	54727c82-ebca-4605-a3c9-e0e920b55cb6	2026-05-18 19:05:41.112015
76	23	eb9b45e9-4074-4867-a8dd-083ce3ac5622	2026-05-18 19:05:52.03889
77	23	58b12a0b-73c8-4d2a-a31f-385faf51139a	2026-05-18 19:06:16.158523
78	23	aeb8f987-bcd8-4f34-ac56-b83a13a74042	2026-05-18 19:06:27.496992
\.


--
-- Data for Name: tree_updates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tree_updates (id, tree_id, user_id, photo_url, note, photo_status, created_at) FROM stdin;
9	17	54727c82-ebca-4605-a3c9-e0e920b55cb6	/objects/uploads/68ef6616-0a96-4875-999d-4b6108a25827.webp	\N	approved	2026-04-29 14:06:45.993478
10	17	54727c82-ebca-4605-a3c9-e0e920b55cb6	/objects/uploads/9a591320-3068-4da1-8f0c-98f5cbb8a77a.webp	\N	approved	2026-04-29 14:20:31.684829
11	16	54727c82-ebca-4605-a3c9-e0e920b55cb6	/objects/uploads/99f17ec1-ace3-4f77-8d02-9795f91db0ff.webp	\N	approved	2026-04-29 14:21:36.562401
13	16	54727c82-ebca-4605-a3c9-e0e920b55cb6	/objects/uploads/57d6c5ca-40af-4da9-a0d4-e7891f6565e5.webp	\N	approved	2026-04-29 15:01:24.088145
16	20	4ecb752d-4ab2-4d31-93b3-6482a3f7baec	/objects/uploads/b7e88d9f-f007-49e1-9ca8-7058c1e591ff.webp	\N	approved	2026-04-29 17:02:36.568993
17	20	4ecb752d-4ab2-4d31-93b3-6482a3f7baec	/objects/uploads/5058daa2-a6a7-4b12-b45a-544e7671fe68.webp	\N	approved	2026-04-29 17:17:18.436828
\.


--
-- Data for Name: trees; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.trees (id, user_id, photo_url, photo_thumbnail_url, plant_name, caption, species, planted_at, latitude, longitude, location_name, country, province, maps_url, verification_bypassed, photo_status, sun_count, created_at) FROM stdin;
21	54727c82-ebca-4605-a3c9-e0e920b55cb6	/objects/uploads/8a5d4bd0-c514-4275-b9f8-0e303d3b28c4.webp	/objects/uploads/708b0b7d-8115-4dad-8e73-e4188be16ec3.webp	\N	\N	\N	\N	44.50351	7.710913	Sant'Albano Stura	Italia	CN	https://www.google.com/maps?q=44.50351,7.710913&z=17	f	approved	1	2026-05-02 14:11:55.597846
22	54727c82-ebca-4605-a3c9-e0e920b55cb6	/objects/uploads/0bbe1e52-38f1-4ed7-8fd5-1e1b2c57724f.webp	/objects/uploads/155c4d06-1e12-4989-946c-fe5b7ad124de.webp	Pinuccio 	\N	Pino	\N	44.375626	7.493577	Cervasca	Italia	CN	https://www.google.com/maps?q=44.375625,7.493577&z=17	f	approved	0	2026-05-04 14:41:09.275172
17	54727c82-ebca-4605-a3c9-e0e920b55cb6	/objects/uploads/3803e121-0624-4a2c-998b-2392b020abc6.jpg	/objects/uploads/5d991197-b183-407e-b86e-834b9bd40454.jpg	Gina	\N	Castagno	2026-04-16 00:00:00	44	7.472	Vignolo	Italia	\N	https://www.google.com/maps?q=44,7.472&z=17	f	approved	3	2026-04-16 13:53:54.356172
16	54727c82-ebca-4605-a3c9-e0e920b55cb6	/objects/uploads/2364aeb5-92c0-485c-b5ca-77f8796be341.jpg	/objects/uploads/4b230196-aa3e-406f-9caa-af765ffb2586.jpg	Piantina	\N	Ash tree	2026-04-16 00:00:00	44.380928	7.47123	Cervasca	Italia	\N	https://www.google.com/maps?q=44.380928,7.47123&z=17	f	approved	3	2026-04-16 13:51:34.002317
23	54727c82-ebca-4605-a3c9-e0e920b55cb6	/objects/uploads/200cb8ea-6995-4cb5-b359-39c8004c7116.webp	/objects/uploads/c1bbc45c-5b62-4597-b7d0-e5005be9b4f2.webp	Nixon	\N	Noce	\N	44.375343	7.491358	Santa Croce (Cervasca)	Italia	CN	https://www.google.com/maps?q=44.375343,7.491358&z=17	f	approved	4	2026-05-04 14:42:55.912057
20	4ecb752d-4ab2-4d31-93b3-6482a3f7baec	/objects/uploads/3e32e28f-845e-43ac-980f-6f260a3a27ed.webp	/objects/uploads/78cace18-6461-4662-9c62-e424d598540b.webp	Fiorella 	\N	Fiore	\N	40.923267	9.502745	Olbia	Italia	Gallura Nord-Est Sardegna	https://www.google.com/maps?q=40.9232659,9.5027442&z=17	f	approved	0	2026-04-29 17:00:18.055576
18	54727c82-ebca-4605-a3c9-e0e920b55cb6	/objects/uploads/6dd255c0-26e3-4a53-9816-ee61dc9eca09.webp	/objects/uploads/f796c5e4-9866-49dd-b4a7-bfe2b65ab505.webp	Nella	\N	Nocciolo	\N	44.508934	7.722333	Sant'Albano Stura	Italia	Cuneo	https://www.google.com/maps?q=44.508934,7.722333&z=17	f	approved	0	2026-04-28 09:03:22.606975
\.


--
-- Data for Name: user_consents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_consents (id, user_id, policy_id, accepted, accepted_at, ip_address, user_agent) FROM stdin;
2d3c8136-8d8e-4008-bb62-1313db4e7d9f	org:3	042fade4-0ec3-43a9-804f-cb065e832bc9	t	2026-04-12 15:47:42.822035	151.34.41.243	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36
f2e0767f-fc64-4bf5-94a0-7dccb3435f20	org:3	831f11bb-3eb1-45b9-a3ae-0a1f0f41d0b5	t	2026-04-12 15:47:42.822035	151.34.41.243	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36
6fe35cdf-5d36-4de0-99a0-69c9cf42bde2	org:5	042fade4-0ec3-43a9-804f-cb065e832bc9	t	2026-04-12 17:07:11.053992	151.34.70.42	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36
de2192a0-0157-4b2f-85ba-4b0262a7e418	org:5	831f11bb-3eb1-45b9-a3ae-0a1f0f41d0b5	t	2026-04-12 17:07:11.053992	151.34.70.42	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36
6f59e7ec-6198-4c79-9cb6-2e3c0f6701c8	org:6	042fade4-0ec3-43a9-804f-cb065e832bc9	t	2026-04-13 12:05:19.230176	151.82.150.201	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
e631a767-1983-4010-a144-e95791060099	org:6	831f11bb-3eb1-45b9-a3ae-0a1f0f41d0b5	t	2026-04-13 12:05:19.230176	151.82.150.201	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
7b493c9e-06e8-4f45-87b9-5f076ae50948	3c156c0d-15e4-45b8-b0ea-e005e2e60514	042fade4-0ec3-43a9-804f-cb065e832bc9	t	2026-04-13 12:05:19.230176	151.82.150.201	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
a0547f7b-a163-47aa-a151-b7b1e4088ef3	3c156c0d-15e4-45b8-b0ea-e005e2e60514	831f11bb-3eb1-45b9-a3ae-0a1f0f41d0b5	t	2026-04-13 12:05:19.230176	151.82.150.201	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
5af49329-da39-4da6-b4b0-7bf3ca7cdcc9	org:7	042fade4-0ec3-43a9-804f-cb065e832bc9	t	2026-04-13 16:13:48.524165	151.82.210.236	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
034ac958-bff1-49b3-815a-611c77924d5b	org:7	831f11bb-3eb1-45b9-a3ae-0a1f0f41d0b5	t	2026-04-13 16:13:48.524165	151.82.210.236	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
5d4b02e5-718d-4960-a455-973be904c081	a9571e28-6a9f-4ced-b03f-20822d65f866	042fade4-0ec3-43a9-804f-cb065e832bc9	t	2026-04-13 16:13:48.524165	151.82.210.236	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
9f4495fd-b2ff-484a-8d21-c32589c4a2e7	a9571e28-6a9f-4ced-b03f-20822d65f866	831f11bb-3eb1-45b9-a3ae-0a1f0f41d0b5	t	2026-04-13 16:13:48.524165	151.82.210.236	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
be5fc989-fc16-4407-b42a-513ffbe0bf9e	org:8	042fade4-0ec3-43a9-804f-cb065e832bc9	t	2026-04-13 16:43:46.232577	::1	curl/8.14.1
ef445ec3-3797-4165-85a4-bf4e48afe08a	org:8	831f11bb-3eb1-45b9-a3ae-0a1f0f41d0b5	t	2026-04-13 16:43:46.232577	::1	curl/8.14.1
059a6e52-e814-43b0-88af-216645f7bef6	cd59730a-42d2-4db2-a82a-93f723c2a01f	042fade4-0ec3-43a9-804f-cb065e832bc9	t	2026-04-13 16:43:46.232577	::1	curl/8.14.1
8016fda6-2a6c-4cb9-b190-ca951573163d	cd59730a-42d2-4db2-a82a-93f723c2a01f	831f11bb-3eb1-45b9-a3ae-0a1f0f41d0b5	t	2026-04-13 16:43:46.232577	::1	curl/8.14.1
9e0845fb-8d1d-4cca-b36a-d1783606d4dd	org:9	042fade4-0ec3-43a9-804f-cb065e832bc9	t	2026-04-13 16:46:03.981688	151.82.210.236	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
b91e3f34-3f45-47d8-90bc-780d87e3a330	org:9	831f11bb-3eb1-45b9-a3ae-0a1f0f41d0b5	t	2026-04-13 16:46:03.981688	151.82.210.236	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
164c1eee-7bbb-41c3-bc18-c8070597c0e3	593e94bc-b922-4578-a3aa-55c85eff0946	042fade4-0ec3-43a9-804f-cb065e832bc9	t	2026-04-13 16:46:03.981688	151.82.210.236	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
a766689c-d18f-458d-8ca7-c6155ffb6187	593e94bc-b922-4578-a3aa-55c85eff0946	831f11bb-3eb1-45b9-a3ae-0a1f0f41d0b5	t	2026-04-13 16:46:03.981688	151.82.210.236	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
e396de39-393d-4aa4-85a1-403f372d0d01	org:10	042fade4-0ec3-43a9-804f-cb065e832bc9	t	2026-04-14 08:00:47.498058	151.82.212.16	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
216bd8e0-9d1d-4f4a-94a5-14a70a7e2bb6	org:10	831f11bb-3eb1-45b9-a3ae-0a1f0f41d0b5	t	2026-04-14 08:00:47.498058	151.82.212.16	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
6559f250-1a3e-4844-8aa9-6dcd9c2c169d	86fe9024-a29e-4d5c-8c09-a152f22b1e93	042fade4-0ec3-43a9-804f-cb065e832bc9	t	2026-04-14 08:00:47.498058	151.82.212.16	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
d40b30a3-67f0-484c-ad25-1b73cc7ba4ea	86fe9024-a29e-4d5c-8c09-a152f22b1e93	831f11bb-3eb1-45b9-a3ae-0a1f0f41d0b5	t	2026-04-14 08:00:47.498058	151.82.212.16	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
a10324e6-02ae-46e4-9b70-aeccdf47d969	org:11	042fade4-0ec3-43a9-804f-cb065e832bc9	t	2026-04-14 13:35:49.103512	151.18.184.254	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
14ac3d9d-1557-4d5a-a244-d1cbe22888e9	org:11	831f11bb-3eb1-45b9-a3ae-0a1f0f41d0b5	t	2026-04-14 13:35:49.103512	151.18.184.254	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
19b1c221-88f6-457f-aabc-363876fd210f	7e862239-f045-403b-a3e7-5bc7ae5a8ca2	042fade4-0ec3-43a9-804f-cb065e832bc9	t	2026-04-14 13:35:49.103512	151.18.184.254	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
ac977412-6e07-4dd2-99b6-1f71628839ce	7e862239-f045-403b-a3e7-5bc7ae5a8ca2	831f11bb-3eb1-45b9-a3ae-0a1f0f41d0b5	t	2026-04-14 13:35:49.103512	151.18.184.254	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
0278e37f-2389-4fdd-a06d-be0f3122708c	org:13	042fade4-0ec3-43a9-804f-cb065e832bc9	t	2026-05-01 09:48:02.781768	151.82.98.111	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
1f67d3b1-b530-4c99-b2bc-fe0964c70a0d	org:13	831f11bb-3eb1-45b9-a3ae-0a1f0f41d0b5	t	2026-05-01 09:48:02.781768	151.82.98.111	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
40d7ae8c-c783-4840-b1e0-cf8a2da633bf	58b12a0b-73c8-4d2a-a31f-385faf51139a	042fade4-0ec3-43a9-804f-cb065e832bc9	t	2026-05-01 09:48:02.781768	151.82.98.111	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
896915be-ccc4-435b-9727-870a9ac3e069	58b12a0b-73c8-4d2a-a31f-385faf51139a	831f11bb-3eb1-45b9-a3ae-0a1f0f41d0b5	t	2026-05-01 09:48:02.781768	151.82.98.111	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
292cdbc7-1194-4ddc-b4f3-81487b918448	org:14	042fade4-0ec3-43a9-804f-cb065e832bc9	t	2026-05-01 13:52:00.425833	151.36.16.112	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
9c24ed00-302a-4f40-af30-a15a17dc3a20	org:14	831f11bb-3eb1-45b9-a3ae-0a1f0f41d0b5	t	2026-05-01 13:52:00.425833	151.36.16.112	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
f0254dd2-2898-47a9-82b9-2e46c6f76adb	51157c90-0e76-41f7-b13b-f27a020793c3	042fade4-0ec3-43a9-804f-cb065e832bc9	t	2026-05-01 13:52:00.425833	151.36.16.112	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
c9c3acc7-1cb3-4127-adc4-002be6e0931c	51157c90-0e76-41f7-b13b-f27a020793c3	831f11bb-3eb1-45b9-a3ae-0a1f0f41d0b5	t	2026-05-01 13:52:00.425833	151.36.16.112	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
ed95f640-7ade-415b-83b3-60bfc14ff0cf	54727c82-ebca-4605-a3c9-e0e920b55cb6	042fade4-0ec3-43a9-804f-cb065e832bc9	t	2026-05-04 14:29:35.103679	151.38.171.148	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
c4e2210b-b57c-4471-88ac-03c8a5301035	54727c82-ebca-4605-a3c9-e0e920b55cb6	831f11bb-3eb1-45b9-a3ae-0a1f0f41d0b5	t	2026-05-04 14:29:35.103679	151.38.171.148	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
08496681-733a-4816-abf8-8124e474b6f6	54727c82-ebca-4605-a3c9-e0e920b55cb6	e1dbb84c-cf68-4772-9629-e49810aa9ee5	t	2026-05-04 20:07:11.190947	151.36.84.127	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
7ec26325-c060-4e0c-b5fb-cfc6069c1d9c	54727c82-ebca-4605-a3c9-e0e920b55cb6	c0a93a0a-981a-485f-8da3-a50f88b53b3e	t	2026-05-04 20:07:11.190947	151.36.84.127	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
36c4475d-a27f-4672-a890-1602b67f5387	54727c82-ebca-4605-a3c9-e0e920b55cb6	5afbeaae-0d84-4d0e-a289-c9fbe872ed2a	t	2026-05-04 20:07:11.190947	151.36.84.127	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
66b5983b-b367-4ae4-bed5-ceeaf5f545ee	54727c82-ebca-4605-a3c9-e0e920b55cb6	e1dbb84c-cf68-4772-9629-e49810aa9ee5	t	2026-05-04 20:11:57.897705	151.36.84.127	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
30839d29-d122-4c5f-a2bc-f9a7223ad658	54727c82-ebca-4605-a3c9-e0e920b55cb6	c1e0eab7-0137-4f64-b02a-5bf73293bb11	f	2026-05-04 20:11:57.897705	151.36.84.127	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
39388984-e727-4cb5-88dd-0ec7acf70de2	54727c82-ebca-4605-a3c9-e0e920b55cb6	e1dbb84c-cf68-4772-9629-e49810aa9ee5	f	2026-05-04 20:12:45.274635	151.36.84.127	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
3071f727-90f4-4765-bbf4-d43837202bdd	54727c82-ebca-4605-a3c9-e0e920b55cb6	e1dbb84c-cf68-4772-9629-e49810aa9ee5	f	2026-05-04 20:13:59.239019	151.36.84.127	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
e2c41d74-19f0-4fbc-ac06-05241901bd93	54727c82-ebca-4605-a3c9-e0e920b55cb6	e1dbb84c-cf68-4772-9629-e49810aa9ee5	f	2026-05-04 20:15:16.988573	151.36.84.127	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
9af513c4-bbf6-44b6-b46e-e7388641b913	54727c82-ebca-4605-a3c9-e0e920b55cb6	c1e0eab7-0137-4f64-b02a-5bf73293bb11	f	2026-05-04 20:15:16.988573	151.36.84.127	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
6c1b5f25-44b4-4c0b-a4d3-eaeb74f0c09e	54727c82-ebca-4605-a3c9-e0e920b55cb6	c0a93a0a-981a-485f-8da3-a50f88b53b3e	t	2026-05-07 09:58:04.859921	151.44.185.153	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
0d933edf-9007-4bf1-87d1-54a8e65df20a	54727c82-ebca-4605-a3c9-e0e920b55cb6	042fade4-0ec3-43a9-804f-cb065e832bc9	t	2026-05-07 09:58:04.859921	151.44.185.153	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
ee0a3e67-96e1-4e39-a17e-c9d2f7b7845b	54727c82-ebca-4605-a3c9-e0e920b55cb6	c1e0eab7-0137-4f64-b02a-5bf73293bb11	t	2026-05-07 10:40:23.880806	151.44.185.153	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
41d0bac7-ce87-4d3d-9906-df9ca20d6e99	54727c82-ebca-4605-a3c9-e0e920b55cb6	e1dbb84c-cf68-4772-9629-e49810aa9ee5	t	2026-05-07 11:13:18.601675	151.36.147.192	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
4dad9c1e-7374-4ec7-abbd-0461ec0b9798	54727c82-ebca-4605-a3c9-e0e920b55cb6	c1e0eab7-0137-4f64-b02a-5bf73293bb11	t	2026-05-07 11:13:18.601675	151.36.147.192	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
f69ecb6b-6720-4db0-986f-1109bfccc2ad	54727c82-ebca-4605-a3c9-e0e920b55cb6	c1e0eab7-0137-4f64-b02a-5bf73293bb11	f	2026-05-07 11:22:48.177118	151.36.147.192	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
b181d065-5e17-4b87-b641-edb2635a4a63	ba117f10-0112-4d15-b59f-4928491bc983	c1e0eab7-0137-4f64-b02a-5bf73293bb11	t	2026-05-07 14:44:16.833579	151.36.37.22	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36
52d354da-d66a-4682-adcb-93be2726690e	ba117f10-0112-4d15-b59f-4928491bc983	5afbeaae-0d84-4d0e-a289-c9fbe872ed2a	t	2026-05-07 14:44:16.833579	151.36.37.22	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36
9c2fe5f2-aee5-47b4-bbfc-ae8bab1288a6	ba117f10-0112-4d15-b59f-4928491bc983	c0a93a0a-981a-485f-8da3-a50f88b53b3e	t	2026-05-07 14:44:16.833579	151.36.37.22	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36
8ec7a2b8-df83-43f1-9f31-1e2f481ece73	ba117f10-0112-4d15-b59f-4928491bc983	042fade4-0ec3-43a9-804f-cb065e832bc9	t	2026-05-07 14:44:16.833579	151.36.37.22	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36
96fa1ff5-366a-4fea-bdd7-fb748931a77c	ba117f10-0112-4d15-b59f-4928491bc983	e1dbb84c-cf68-4772-9629-e49810aa9ee5	t	2026-05-07 14:44:16.833579	151.36.37.22	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36
789484f7-a762-4547-82fa-3810e3d5e0f1	org:15	042fade4-0ec3-43a9-804f-cb065e832bc9	t	2026-05-07 14:44:38.935398	151.36.37.22	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36
e60364e2-5186-4c86-aa4f-3705f12aef77	org:15	c0a93a0a-981a-485f-8da3-a50f88b53b3e	t	2026-05-07 14:44:38.935398	151.36.37.22	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36
d228f669-ef67-47fb-bd55-23fcac500b88	eb9b45e9-4074-4867-a8dd-083ce3ac5622	042fade4-0ec3-43a9-804f-cb065e832bc9	t	2026-05-07 14:44:38.935398	151.36.37.22	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36
b8006d32-9664-4cb7-ae71-9abc091e1769	eb9b45e9-4074-4867-a8dd-083ce3ac5622	c0a93a0a-981a-485f-8da3-a50f88b53b3e	t	2026-05-07 14:44:38.935398	151.36.37.22	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36
4340ec74-6c98-4952-85b1-8e300c95a4ef	eb9b45e9-4074-4867-a8dd-083ce3ac5622	c1e0eab7-0137-4f64-b02a-5bf73293bb11	f	2026-05-07 14:44:57.563326	151.36.37.22	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36
b51ae54b-ac6b-4a05-9a7e-e8676a394f9e	eb9b45e9-4074-4867-a8dd-083ce3ac5622	5afbeaae-0d84-4d0e-a289-c9fbe872ed2a	t	2026-05-07 14:44:57.563326	151.36.37.22	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36
60a8ad39-b971-4b69-a8e3-dd76250e09d1	eb9b45e9-4074-4867-a8dd-083ce3ac5622	c0a93a0a-981a-485f-8da3-a50f88b53b3e	t	2026-05-07 14:44:57.563326	151.36.37.22	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36
2f894934-30ad-401b-a8be-5b2fc70624bc	eb9b45e9-4074-4867-a8dd-083ce3ac5622	042fade4-0ec3-43a9-804f-cb065e832bc9	t	2026-05-07 14:44:57.563326	151.36.37.22	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36
a6a51b81-1ef2-4e0d-871a-81ebdcdfbac6	eb9b45e9-4074-4867-a8dd-083ce3ac5622	e1dbb84c-cf68-4772-9629-e49810aa9ee5	f	2026-05-07 14:44:57.563326	151.36.37.22	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36
b3d96a8d-a8dd-4933-8dd5-b3659a03870d	63f8b171-c91a-4ace-a0d0-6a975ec3890b	c1e0eab7-0137-4f64-b02a-5bf73293bb11	f	2026-06-10 20:03:35.421723	151.82.23.2	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
726aae57-66fe-4ff7-898d-3cea4cb7ed94	63f8b171-c91a-4ace-a0d0-6a975ec3890b	5afbeaae-0d84-4d0e-a289-c9fbe872ed2a	t	2026-06-10 20:03:35.421723	151.82.23.2	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
19b1cea4-4b96-40f0-8a0c-a015675a7b05	63f8b171-c91a-4ace-a0d0-6a975ec3890b	c0a93a0a-981a-485f-8da3-a50f88b53b3e	t	2026-06-10 20:03:35.421723	151.82.23.2	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
5e69cabb-0b83-4bee-8f1b-d66aae02d42d	63f8b171-c91a-4ace-a0d0-6a975ec3890b	042fade4-0ec3-43a9-804f-cb065e832bc9	t	2026-06-10 20:03:35.421723	151.82.23.2	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
bc600165-db98-47b2-8ee4-6257d6ae80ff	63f8b171-c91a-4ace-a0d0-6a975ec3890b	e1dbb84c-cf68-4772-9629-e49810aa9ee5	f	2026-06-10 20:03:35.421723	151.82.23.2	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
1374a9da-4366-4a7e-93b7-38df021ecc05	44af1f6a-58c5-462b-8085-b1fa4a7f1a9d	c1e0eab7-0137-4f64-b02a-5bf73293bb11	f	2026-06-12 06:38:51.250245	151.18.87.120	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36
baa36ebf-296d-4ae0-bc0c-f6205bee0f8f	44af1f6a-58c5-462b-8085-b1fa4a7f1a9d	5afbeaae-0d84-4d0e-a289-c9fbe872ed2a	t	2026-06-12 06:38:51.250245	151.18.87.120	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36
fbe95627-eb58-43c0-bf00-e01bd6eb26bd	44af1f6a-58c5-462b-8085-b1fa4a7f1a9d	c0a93a0a-981a-485f-8da3-a50f88b53b3e	t	2026-06-12 06:38:51.250245	151.18.87.120	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36
b5928e4d-5a5d-4434-9f5a-21cf60fd2184	44af1f6a-58c5-462b-8085-b1fa4a7f1a9d	042fade4-0ec3-43a9-804f-cb065e832bc9	t	2026-06-12 06:38:51.250245	151.18.87.120	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36
a4a0a8c7-7a71-433d-806e-cfb742360501	44af1f6a-58c5-462b-8085-b1fa4a7f1a9d	e1dbb84c-cf68-4772-9629-e49810aa9ee5	t	2026-06-12 06:38:51.250245	151.18.87.120	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36
c2880d25-5067-40f4-ba49-a3be61a19202	54727c82-ebca-4605-a3c9-e0e920b55cb6	042fade4-0ec3-43a9-804f-cb065e832bc9	t	2026-06-18 07:55:17.24577	151.82.24.202	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
5e3f320c-38d2-4dc0-9fc3-1ef66cb853f8	54727c82-ebca-4605-a3c9-e0e920b55cb6	c0a93a0a-981a-485f-8da3-a50f88b53b3e	t	2026-06-18 07:55:17.24577	151.82.24.202	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
17a1ed65-0267-4507-828f-d8397e81ea12	c6db1b67-d610-4503-b686-86fff6d5bace	c1e0eab7-0137-4f64-b02a-5bf73293bb11	t	2026-06-18 08:06:18.600175	151.82.24.202	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
63c2ef30-63d7-44ee-8181-623685dac60b	c6db1b67-d610-4503-b686-86fff6d5bace	042fade4-0ec3-43a9-804f-cb065e832bc9	t	2026-06-18 08:06:18.600175	151.82.24.202	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
b2bc01e5-98d4-4d1f-98fc-c7d0c22e5466	c6db1b67-d610-4503-b686-86fff6d5bace	c0a93a0a-981a-485f-8da3-a50f88b53b3e	t	2026-06-18 08:06:18.600175	151.82.24.202	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
31ae24a0-e693-44c4-8bf6-8423697bd4fa	c6db1b67-d610-4503-b686-86fff6d5bace	5afbeaae-0d84-4d0e-a289-c9fbe872ed2a	t	2026-06-18 08:06:18.600175	151.82.24.202	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
18aef849-ada9-4242-bb82-9de57b64fee9	c6db1b67-d610-4503-b686-86fff6d5bace	e1dbb84c-cf68-4772-9629-e49810aa9ee5	t	2026-06-18 08:06:18.600175	151.82.24.202	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36
\.


--
-- Data for Name: user_notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_notifications (id, user_id, title, message, is_read, created_at, type, related_id) FROM stdin;
23	54727c82-ebca-4605-a3c9-e0e920b55cb6	🌞 Complimenti!	La tua pianta è la Pianta della Settimana di TreeShare! Tocca per vederla.	t	2026-05-03 06:45:14.987674	weekly_winner	16
3	54727c82-ebca-4605-a3c9-e0e920b55cb6	Evento approvato	Il tuo evento "Grgegg3" è stato approvato ed è ora pubblicato.	t	2026-04-14 00:52:06.60622	\N	\N
4	54727c82-ebca-4605-a3c9-e0e920b55cb6	Evento approvato	Il tuo evento "Piantiamo" è stato approvato ed è ora pubblicato.	t	2026-04-20 11:18:33.044658	\N	\N
5	593e94bc-b922-4578-a3aa-55c85eff0946	🌳 Nuova adozione ricevuta per "Hdhdbehdhdh"	ID adozione: #8 · Codice: ADO-060DFFA9 · Durata: 30 giorni · Importo pagato: €15,00 · Netto a te (70%): €10,50	t	2026-04-22 15:55:56.604821	\N	\N
6	593e94bc-b922-4578-a3aa-55c85eff0946	Ciao	Ciao	t	2026-04-22 16:15:39.995475	\N	\N
7	593e94bc-b922-4578-a3aa-55c85eff0946	✅ Albero approvato	Il tuo albero "Bonsai" è stato approvato e pubblicato. Gli adottanti possono ora vederlo.	t	2026-04-22 18:04:17.970558	\N	\N
8	593e94bc-b922-4578-a3aa-55c85eff0946	✅ Albero approvato	Il tuo albero "Hdhdbehdhdh" è stato approvato e pubblicato. Gli adottanti possono ora vederlo.	t	2026-04-22 18:04:20.86385	\N	\N
9	593e94bc-b922-4578-a3aa-55c85eff0946	✅ Albero approvato	Il tuo albero "Nina" è stato approvato e pubblicato. Gli adottanti possono ora vederlo.	t	2026-04-22 18:04:22.259653	\N	\N
10	593e94bc-b922-4578-a3aa-55c85eff0946	✅ Albero approvato	Il tuo albero "Albino" è stato approvato e pubblicato. Gli adottanti possono ora vederlo.	t	2026-04-22 18:04:23.569931	\N	\N
11	593e94bc-b922-4578-a3aa-55c85eff0946	✅ Albero approvato	Il tuo albero "Gino" è stato approvato e pubblicato. Gli adottanti possono ora vederlo.	t	2026-04-22 18:04:24.628542	\N	\N
12	593e94bc-b922-4578-a3aa-55c85eff0946	✅ Albero approvato	Il tuo albero "Fiorello" è stato approvato e pubblicato. Gli adottanti possono ora vederlo.	t	2026-04-22 18:04:25.560225	\N	\N
14	54727c82-ebca-4605-a3c9-e0e920b55cb6	Ciao	Ciao Marica	t	2026-04-23 03:15:27.615684	\N	\N
13	593e94bc-b922-4578-a3aa-55c85eff0946	✅ Albero approvato	Il tuo albero "Limone" è stato approvato e pubblicato. Gli adottanti possono ora vederlo.	t	2026-04-22 18:07:15.019517	\N	\N
18	54727c82-ebca-4605-a3c9-e0e920b55cb6	🌞 Complimenti!	La tua pianta è la Pianta della Settimana di TreeShare!	t	2026-04-27 14:53:39.138295	weekly_winner	16
19	54727c82-ebca-4605-a3c9-e0e920b55cb6	🌞 Complimenti!	La tua pianta è la Pianta della Settimana di TreeShare! Tocca per vederla.	t	2026-04-27 16:18:29.519004	weekly_winner	17
20	54727c82-ebca-4605-a3c9-e0e920b55cb6	Aggiornamento foto in attesa	Una nuova foto per la pianta "Fiorella " richiede approvazione. Vai nel pannello admin → Aggiorn. in attesa.	t	2026-04-29 17:17:18.609718	pending_tree_update	17
21	4ecb752d-4ab2-4d31-93b3-6482a3f7baec	Foto approvata ✓	La tua foto di aggiornamento per la pianta "Fiorella " è stata approvata e pubblicata.	t	2026-04-29 17:17:57.212103	tree_update_approved	17
22	54727c82-ebca-4605-a3c9-e0e920b55cb6	Evento rifiutato	Il tuo evento "Hshhwh" non è stato approvato.	t	2026-05-02 09:31:54.737173	\N	\N
24	54727c82-ebca-4605-a3c9-e0e920b55cb6	Evento approvato	Il tuo evento "Camminata nella natura" è stato approvato ed è ora pubblicato.	t	2026-05-03 09:54:48.889222	\N	\N
57	593e94bc-b922-4578-a3aa-55c85eff0946	Campagna in scadenza	La campagna "Orto sociale" scade a breve. Puoi rinnovarla dal tuo profilo.	f	2026-05-07 21:59:00.041625	\N	\N
58	593e94bc-b922-4578-a3aa-55c85eff0946	Campagna in scadenza	La campagna "Fruttalo" scade a breve. Puoi rinnovarla dal tuo profilo.	f	2026-05-07 21:59:00.536136	\N	\N
59	54727c82-ebca-4605-a3c9-e0e920b55cb6	🌞 Complimenti!	La tua pianta è la Pianta della Settimana di TreeShare! Tocca per vederla.	t	2026-05-11 18:15:56.021367	weekly_winner	17
60	54727c82-ebca-4605-a3c9-e0e920b55cb6	🌞 Complimenti!	La tua pianta è la Pianta della Settimana di TreeShare! Tocca per vederla.	t	2026-05-18 19:04:24.566677	weekly_winner	17
61	54727c82-ebca-4605-a3c9-e0e920b55cb6	🌞 Complimenti!	La tua pianta è la Pianta della Settimana di TreeShare! Tocca per vederla.	t	2026-05-27 07:19:07.853438	weekly_winner	23
62	54727c82-ebca-4605-a3c9-e0e920b55cb6	🌞 Complimenti!	La tua pianta è la Pianta della Settimana di TreeShare! Tocca per vederla.	t	2026-06-03 20:06:45.20645	weekly_winner	23
63	54727c82-ebca-4605-a3c9-e0e920b55cb6	🌞 Complimenti!	La tua pianta è la Pianta della Settimana di TreeShare! Tocca per vederla.	t	2026-06-08 20:36:39.16116	weekly_winner	23
64	54727c82-ebca-4605-a3c9-e0e920b55cb6	🌞 Complimenti!	La tua pianta è la Pianta della Settimana di TreeShare! Tocca per vederla.	t	2026-06-16 06:00:43.421727	weekly_winner	23
65	c6db1b67-d610-4503-b686-86fff6d5bace	Segnalazione rimossa	La tua segnalazione outdoor "Frana" è stata rimossa dall'amministratore per violazione dei Termini e Condizioni.	t	2026-06-18 08:05:33.020473	outdoor_report_removed	5
66	54727c82-ebca-4605-a3c9-e0e920b55cb6	🌞 Complimenti!	La tua pianta è la Pianta della Settimana di TreeShare! Tocca per vederla.	t	2026-06-23 18:14:42.48852	weekly_winner	23
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, clerk_user_id, username, photo_url, country, city, trees_planted, is_blocked, created_at, account_type, stripe_account_id) FROM stdin;
11	593e94bc-b922-4578-a3aa-55c85eff0946	Az. Agricola F.lli Gatti	\N	\N	\N	0	f	2026-04-13 16:46:03.981688	organization	acct_1TOx1gILktRCQX7m
14	4ecb752d-4ab2-4d31-93b3-6482a3f7baec	penny_p	\N	\N	\N	1	f	2026-04-22 10:51:59.653152	user	\N
15	212ed925-19b1-4ad1-a7be-a7d9852475ef	lara_rossi	\N	\N	\N	0	f	2026-04-30 19:38:49.238003	user	\N
48	cc1b029c-98d0-4988-b48c-b5da2b176825	marica_arzu	\N	Italia	Cuneo (CN)	0	f	2026-05-01 07:22:07.938218	user	\N
49	0ba3289a-2af9-46df-8cb0-d4abbc4701df	marica_arzu	\N	Italia	Cuneo (CN)	0	f	2026-05-01 07:47:55.383262	user	\N
51	58b12a0b-73c8-4d2a-a31f-385faf51139a	kali_1491	\N	\N	\N	0	f	2026-05-01 09:48:02.781768	organization	\N
52	c4c6a164-b155-4a17-beb2-069195567106	mario_rossi	\N	Italia	Roma (RM)	0	f	2026-05-01 09:51:04.426336	user	\N
53	66fd2d1a-c26b-4c34-ab14-4294cbb491fb	mario_rossi	\N	Italia	Milano (MI)	0	f	2026-05-01 09:52:06.357568	user	\N
54	aeb8f987-bcd8-4f34-ac56-b83a13a74042	marica_arzu	\N	Italia	Cuneo (CN)	0	f	2026-05-01 10:43:15.760604	user	\N
55	934be0b8-4a21-4217-a724-3e954294d493	marica_arzu	\N	Italia	Cuneo (CN)	0	f	2026-05-01 10:49:29.344584	user	\N
56	32ab0048-74fc-4faf-be07-c6aabcc7ce9f	marica_arzu	\N	Italia	Cuneo (CN)	0	f	2026-05-01 10:58:06.470455	user	\N
8	3c156c0d-15e4-45b8-b0ea-e005e2e60514	Pacho86	\N	\N	\N	0	f	2026-04-13 12:05:18.579252	organization	\N
10	cd59730a-42d2-4db2-a82a-93f723c2a01f	testentedebug2	\N	\N	\N	0	f	2026-04-13 16:43:46.232577	organization	\N
12	86fe9024-a29e-4d5c-8c09-a152f22b1e93	Ricettanuova	\N	\N	\N	0	f	2026-04-14 08:00:47.498058	organization	\N
13	7e862239-f045-403b-a3e7-5bc7ae5a8ca2	Gshdhbdbehe	\N	\N	\N	0	f	2026-04-14 13:35:49.103512	organization	\N
9	a9571e28-6a9f-4ced-b03f-20822d65f866	mari_ar	\N	Italia	Cuneo (CN)	0	f	2026-04-13 16:13:48.131947	organization	\N
57	9b2d2397-ffc2-4a7f-b5e6-2a4b7cbfef1e	marica_arzu	\N	Italia	Cuneo (CN)	0	f	2026-05-01 11:23:31.292229	user	\N
58	709abd78-f45d-41f7-b8d6-53beb2295211	fiori_rossi	\N	Italia	Cuneo (CN)	0	f	2026-05-01 12:56:21.551267	user	\N
59	ba117f10-0112-4d15-b59f-4928491bc983	carla_cassi	\N	Italia	Cuneo (CN)	0	f	2026-05-01 13:24:13.523307	user	\N
60	51157c90-0e76-41f7-b13b-f27a020793c3	cucu_7505	\N	\N	\N	0	f	2026-05-01 13:52:00.425833	organization	\N
61	6af0570c-0367-4bae-9b49-e51a24d71082	carolina_gaudenti	\N	\N	\N	0	f	2026-05-02 11:13:29.781791	user	\N
5	54727c82-ebca-4605-a3c9-e0e920b55cb6	Marikina	\N	\N	\N	6	f	2026-04-12 14:28:15.812108	user	\N
62	eb9b45e9-4074-4867-a8dd-083ce3ac5622	marica_5658	\N	\N	\N	0	f	2026-05-07 14:44:38.935398	organization	\N
64	63f8b171-c91a-4ace-a0d0-6a975ec3890b	marica_arzu	\N	\N	\N	0	f	2026-06-10 20:03:20.63384	user	\N
65	44af1f6a-58c5-462b-8085-b1fa4a7f1a9d	marica_arzu	\N	\N	\N	0	f	2026-06-12 06:12:20.394966	user	\N
67	c6db1b67-d610-4503-b686-86fff6d5bace	marica_arzu	\N	\N	\N	0	f	2026-06-18 08:05:58.455433	user	\N
\.


--
-- Data for Name: weekly_winners; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.weekly_winners (id, tree_id, user_id, province, sun_count, week_start) FROM stdin;
6	17	54727c82-ebca-4605-a3c9-e0e920b55cb6	Italia	3	2026-04-20 00:00:00
7	16	54727c82-ebca-4605-a3c9-e0e920b55cb6	Italia	3	2026-04-27 00:00:00
8	17	54727c82-ebca-4605-a3c9-e0e920b55cb6	Italia	3	2026-05-04 00:00:00
9	17	54727c82-ebca-4605-a3c9-e0e920b55cb6	Italia	3	2026-05-11 00:00:00
10	23	54727c82-ebca-4605-a3c9-e0e920b55cb6	CN	4	2026-05-18 00:00:00
11	23	54727c82-ebca-4605-a3c9-e0e920b55cb6	CN	4	2026-05-25 00:00:00
12	23	54727c82-ebca-4605-a3c9-e0e920b55cb6	CN	4	2026-06-01 00:00:00
13	23	54727c82-ebca-4605-a3c9-e0e920b55cb6	CN	4	2026-06-08 00:00:00
14	23	54727c82-ebca-4605-a3c9-e0e920b55cb6	CN	4	2026-06-15 00:00:00
\.


--
-- Name: admin_audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admin_audit_log_id_seq', 33, true);


--
-- Name: adoptable_trees_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.adoptable_trees_id_seq', 43, true);


--
-- Name: alerts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.alerts_id_seq', 7, true);


--
-- Name: banned_emails_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.banned_emails_id_seq', 1, false);


--
-- Name: campaign_pricing_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.campaign_pricing_id_seq', 4, true);


--
-- Name: co2_rankings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.co2_rankings_id_seq', 15, true);


--
-- Name: discount_code_notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.discount_code_notifications_id_seq', 1, true);


--
-- Name: discount_code_uses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.discount_code_uses_id_seq', 4, true);


--
-- Name: discount_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.discount_codes_id_seq', 5, true);


--
-- Name: donation_campaigns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.donation_campaigns_id_seq', 27, true);


--
-- Name: event_participants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.event_participants_id_seq', 1, false);


--
-- Name: events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.events_id_seq', 8, true);


--
-- Name: organizations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.organizations_id_seq', 15, true);


--
-- Name: payment_ledger_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_ledger_id_seq', 28, true);


--
-- Name: platform_revenue_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.platform_revenue_id_seq', 1, true);


--
-- Name: problem_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.problem_reports_id_seq', 1, true);


--
-- Name: reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reports_id_seq', 8, true);


--
-- Name: tips_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tips_id_seq', 52, true);


--
-- Name: trail_report_confirmations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.trail_report_confirmations_id_seq', 1, false);


--
-- Name: trail_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.trail_reports_id_seq', 5, true);


--
-- Name: tree_adoptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tree_adoptions_id_seq', 8, true);


--
-- Name: tree_status_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tree_status_reports_id_seq', 2, true);


--
-- Name: tree_suns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tree_suns_id_seq', 78, true);


--
-- Name: tree_updates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tree_updates_id_seq', 17, true);


--
-- Name: trees_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.trees_id_seq', 23, true);


--
-- Name: user_notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_notifications_id_seq', 66, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 67, true);


--
-- Name: weekly_winners_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.weekly_winners_id_seq', 14, true);


--
-- Name: admin_audit_log admin_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_audit_log
    ADD CONSTRAINT admin_audit_log_pkey PRIMARY KEY (id);


--
-- Name: adoptable_trees adoptable_trees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.adoptable_trees
    ADD CONSTRAINT adoptable_trees_pkey PRIMARY KEY (id);


--
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);


--
-- Name: banned_emails banned_emails_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.banned_emails
    ADD CONSTRAINT banned_emails_email_unique UNIQUE (email);


--
-- Name: banned_emails banned_emails_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.banned_emails
    ADD CONSTRAINT banned_emails_pkey PRIMARY KEY (id);


--
-- Name: campaign_pricing campaign_pricing_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign_pricing
    ADD CONSTRAINT campaign_pricing_pkey PRIMARY KEY (id);


--
-- Name: co2_rankings co2_rankings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.co2_rankings
    ADD CONSTRAINT co2_rankings_pkey PRIMARY KEY (id);


--
-- Name: cookie_consents cookie_consents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cookie_consents
    ADD CONSTRAINT cookie_consents_pkey PRIMARY KEY (id);


--
-- Name: discount_code_notifications discount_code_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discount_code_notifications
    ADD CONSTRAINT discount_code_notifications_pkey PRIMARY KEY (id);


--
-- Name: discount_code_uses discount_code_uses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discount_code_uses
    ADD CONSTRAINT discount_code_uses_pkey PRIMARY KEY (id);


--
-- Name: discount_codes discount_codes_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discount_codes
    ADD CONSTRAINT discount_codes_code_unique UNIQUE (code);


--
-- Name: discount_codes discount_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discount_codes
    ADD CONSTRAINT discount_codes_pkey PRIMARY KEY (id);


--
-- Name: donation_campaigns donation_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.donation_campaigns
    ADD CONSTRAINT donation_campaigns_pkey PRIMARY KEY (id);


--
-- Name: event_participants event_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_participants
    ADD CONSTRAINT event_participants_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_email_ufficiale_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_email_ufficiale_unique UNIQUE (email_ufficiale);


--
-- Name: organizations organizations_partita_iva_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_partita_iva_unique UNIQUE (partita_iva);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_username_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_username_unique UNIQUE (username);


--
-- Name: payment_ledger payment_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_ledger
    ADD CONSTRAINT payment_ledger_pkey PRIMARY KEY (id);


--
-- Name: platform_revenue platform_revenue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.platform_revenue
    ADD CONSTRAINT platform_revenue_pkey PRIMARY KEY (id);


--
-- Name: policies policies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.policies
    ADD CONSTRAINT policies_pkey PRIMARY KEY (id);


--
-- Name: problem_reports problem_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.problem_reports
    ADD CONSTRAINT problem_reports_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: tips tips_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tips
    ADD CONSTRAINT tips_pkey PRIMARY KEY (id);


--
-- Name: trail_report_confirmations trail_report_confirmations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trail_report_confirmations
    ADD CONSTRAINT trail_report_confirmations_pkey PRIMARY KEY (id);


--
-- Name: trail_reports trail_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trail_reports
    ADD CONSTRAINT trail_reports_pkey PRIMARY KEY (id);


--
-- Name: tree_adoptions tree_adoptions_adoption_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tree_adoptions
    ADD CONSTRAINT tree_adoptions_adoption_code_unique UNIQUE (adoption_code);


--
-- Name: tree_adoptions tree_adoptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tree_adoptions
    ADD CONSTRAINT tree_adoptions_pkey PRIMARY KEY (id);


--
-- Name: tree_adoptions tree_adoptions_stripe_payment_intent_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tree_adoptions
    ADD CONSTRAINT tree_adoptions_stripe_payment_intent_id_unique UNIQUE (stripe_payment_intent_id);


--
-- Name: tree_status_reports tree_status_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tree_status_reports
    ADD CONSTRAINT tree_status_reports_pkey PRIMARY KEY (id);


--
-- Name: tree_suns tree_suns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tree_suns
    ADD CONSTRAINT tree_suns_pkey PRIMARY KEY (id);


--
-- Name: tree_updates tree_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tree_updates
    ADD CONSTRAINT tree_updates_pkey PRIMARY KEY (id);


--
-- Name: trees trees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trees
    ADD CONSTRAINT trees_pkey PRIMARY KEY (id);


--
-- Name: user_consents user_consents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_consents
    ADD CONSTRAINT user_consents_pkey PRIMARY KEY (id);


--
-- Name: user_notifications user_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_pkey PRIMARY KEY (id);


--
-- Name: users users_clerk_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_clerk_user_id_unique UNIQUE (clerk_user_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: weekly_winners weekly_winners_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_winners
    ADD CONSTRAINT weekly_winners_pkey PRIMARY KEY (id);


--
-- Name: admin_audit_log_admin_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_audit_log_admin_id_idx ON public.admin_audit_log USING btree (admin_id);


--
-- Name: admin_audit_log_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_audit_log_created_at_idx ON public.admin_audit_log USING btree (created_at);


--
-- Name: adoptable_trees_moderation_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX adoptable_trees_moderation_idx ON public.adoptable_trees USING btree (moderation_status);


--
-- Name: adoptable_trees_owner_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX adoptable_trees_owner_id_idx ON public.adoptable_trees USING btree (owner_id);


--
-- Name: adoptable_trees_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX adoptable_trees_status_idx ON public.adoptable_trees USING btree (status);


--
-- Name: co2_rankings_month_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX co2_rankings_month_idx ON public.co2_rankings USING btree (month);


--
-- Name: cookie_consents_session_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX cookie_consents_session_id_idx ON public.cookie_consents USING btree (session_id);


--
-- Name: discount_code_notif_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX discount_code_notif_code_idx ON public.discount_code_notifications USING btree (discount_code_id);


--
-- Name: discount_code_uses_uniq_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX discount_code_uses_uniq_idx ON public.discount_code_uses USING btree (discount_code_id, user_key);


--
-- Name: discount_codes_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX discount_codes_code_idx ON public.discount_codes USING btree (code);


--
-- Name: discount_codes_expires_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX discount_codes_expires_at_idx ON public.discount_codes USING btree (expires_at);


--
-- Name: donation_campaigns_expires_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX donation_campaigns_expires_at_idx ON public.donation_campaigns USING btree (expires_at);


--
-- Name: donation_campaigns_payment_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX donation_campaigns_payment_status_idx ON public.donation_campaigns USING btree (payment_status);


--
-- Name: donation_campaigns_paypal_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX donation_campaigns_paypal_order_idx ON public.donation_campaigns USING btree (paypal_order_id);


--
-- Name: donation_campaigns_renewal_paypal_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX donation_campaigns_renewal_paypal_order_idx ON public.donation_campaigns USING btree (renewal_paypal_order_id);


--
-- Name: donation_campaigns_renewal_stripe_pi_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX donation_campaigns_renewal_stripe_pi_idx ON public.donation_campaigns USING btree (renewal_stripe_payment_intent_id);


--
-- Name: donation_campaigns_stripe_pi_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX donation_campaigns_stripe_pi_idx ON public.donation_campaigns USING btree (stripe_payment_intent_id);


--
-- Name: donation_campaigns_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX donation_campaigns_user_id_idx ON public.donation_campaigns USING btree (user_id);


--
-- Name: events_moderation_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX events_moderation_status_idx ON public.events USING btree (moderation_status);


--
-- Name: events_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX events_user_id_idx ON public.events USING btree (user_id);


--
-- Name: payment_ledger_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX payment_ledger_created_at_idx ON public.payment_ledger USING btree (created_at);


--
-- Name: payment_ledger_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX payment_ledger_type_idx ON public.payment_ledger USING btree (type);


--
-- Name: payment_ledger_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX payment_ledger_user_id_idx ON public.payment_ledger USING btree (user_id);


--
-- Name: policies_type_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX policies_type_active_idx ON public.policies USING btree (type, is_active);


--
-- Name: trail_confirmations_report_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX trail_confirmations_report_id_idx ON public.trail_report_confirmations USING btree (report_id);


--
-- Name: trail_confirmations_user_report_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX trail_confirmations_user_report_uidx ON public.trail_report_confirmations USING btree (user_id, report_id);


--
-- Name: trail_reports_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX trail_reports_created_at_idx ON public.trail_reports USING btree (created_at);


--
-- Name: trail_reports_status_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX trail_reports_status_created_idx ON public.trail_reports USING btree (status, created_at);


--
-- Name: trail_reports_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX trail_reports_status_idx ON public.trail_reports USING btree (status);


--
-- Name: trail_reports_status_location_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX trail_reports_status_location_idx ON public.trail_reports USING btree (status, latitude, longitude);


--
-- Name: tree_adoptions_end_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tree_adoptions_end_date_idx ON public.tree_adoptions USING btree (end_date);


--
-- Name: tree_adoptions_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tree_adoptions_status_idx ON public.tree_adoptions USING btree (status);


--
-- Name: tree_adoptions_tree_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tree_adoptions_tree_id_idx ON public.tree_adoptions USING btree (tree_id);


--
-- Name: tree_adoptions_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tree_adoptions_user_id_idx ON public.tree_adoptions USING btree (user_id);


--
-- Name: tree_status_reports_tree_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tree_status_reports_tree_id_idx ON public.tree_status_reports USING btree (tree_id);


--
-- Name: tree_status_reports_tree_quarter_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX tree_status_reports_tree_quarter_idx ON public.tree_status_reports USING btree (tree_id, quarter);


--
-- Name: tree_suns_tree_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tree_suns_tree_id_idx ON public.tree_suns USING btree (tree_id);


--
-- Name: tree_suns_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tree_suns_user_id_idx ON public.tree_suns USING btree (user_id);


--
-- Name: tree_updates_tree_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tree_updates_tree_id_idx ON public.tree_updates USING btree (tree_id);


--
-- Name: tree_updates_tree_id_photo_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tree_updates_tree_id_photo_status_idx ON public.tree_updates USING btree (tree_id, photo_status);


--
-- Name: trees_photo_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX trees_photo_status_idx ON public.trees USING btree (photo_status);


--
-- Name: trees_status_location_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX trees_status_location_idx ON public.trees USING btree (photo_status, latitude, longitude);


--
-- Name: trees_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX trees_user_id_idx ON public.trees USING btree (user_id);


--
-- Name: user_consents_policy_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_consents_policy_id_idx ON public.user_consents USING btree (policy_id);


--
-- Name: user_consents_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_consents_user_id_idx ON public.user_consents USING btree (user_id);


--
-- Name: user_notifications_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_notifications_user_id_idx ON public.user_notifications USING btree (user_id);


--
-- Name: weekly_winners_week_start_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX weekly_winners_week_start_idx ON public.weekly_winners USING btree (week_start);


--
-- PostgreSQL database dump complete
--

\unrestrict 1TFyjE1SfMuv9K7hvDoZnSvCvshnUytzvJz0yPVT3nncDLVHf7ljuPgmpnEN6WZ

