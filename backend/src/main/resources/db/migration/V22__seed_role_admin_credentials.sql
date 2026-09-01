-- V22: Seed Login Credentials for All Admin Roles
-- Local / Dev credentials for testing role-based access control.

-- 1. FINANCE_ADMIN: Financeadmin@foodie.local / FoodieMinister@111
INSERT INTO user_credential (id, phone_number, email, password_hash, user_type, active, created_at, updated_at) VALUES
    ('33333333-3333-3333-3333-333333333005', '+919999999995', 'Financeadmin@foodie.local', '$2a$10$KFkoD7CoI6rI7.9nuAmUY.yu983OtqgKJDdTtOtnZLQtE5B8DsAXK', 'ADMIN', TRUE, now(), now())
ON CONFLICT (email) DO UPDATE SET password_hash = '$2a$10$KFkoD7CoI6rI7.9nuAmUY.yu983OtqgKJDdTtOtnZLQtE5B8DsAXK', updated_at = now();

INSERT INTO admin_user (id, user_credential_id, role_id, full_name, created_at, updated_at) VALUES
    ('44444444-4444-4444-4444-444444444005', '33333333-3333-3333-3333-333333333005', '11111111-1111-1111-1111-111111111005', 'Finance Admin', now(), now())
ON CONFLICT (user_credential_id) DO NOTHING;

-- 2. OPERATIONS_ADMIN: opsadmin@foodie.local / FoodieOps@222
INSERT INTO user_credential (id, phone_number, email, password_hash, user_type, active, created_at, updated_at) VALUES
    ('33333333-3333-3333-3333-333333333006', '+919999999996', 'opsadmin@foodie.local', '$2a$10$eoC3yjfyXYF16htuGhFaO.U4oRjK3eyT0acer3kfEIZ5E4IXHfxqG', 'ADMIN', TRUE, now(), now())
ON CONFLICT (email) DO UPDATE SET password_hash = '$2a$10$eoC3yjfyXYF16htuGhFaO.U4oRjK3eyT0acer3kfEIZ5E4IXHfxqG', updated_at = now();

INSERT INTO admin_user (id, user_credential_id, role_id, full_name, created_at, updated_at) VALUES
    ('44444444-4444-4444-4444-444444444006', '33333333-3333-3333-3333-333333333006', '11111111-1111-1111-1111-111111111006', 'Operations Admin', now(), now())
ON CONFLICT (user_credential_id) DO NOTHING;

-- 3. RESTAURANT_MANAGER: manager@foodie.local / FoodieManager@333
INSERT INTO user_credential (id, phone_number, email, password_hash, user_type, active, created_at, updated_at) VALUES
    ('33333333-3333-3333-3333-333333333007', '+919999999997', 'manager@foodie.local', '$2a$10$puoU13jkNrgh3NjXviLkduBcJiRxwLc6k8ZHGkEVPZRiJswC.Ijci', 'ADMIN', TRUE, now(), now())
ON CONFLICT (email) DO UPDATE SET password_hash = '$2a$10$puoU13jkNrgh3NjXviLkduBcJiRxwLc6k8ZHGkEVPZRiJswC.Ijci', updated_at = now();

INSERT INTO admin_user (id, user_credential_id, role_id, full_name, created_at, updated_at) VALUES
    ('44444444-4444-4444-4444-444444444007', '33333333-3333-3333-3333-333333333007', '11111111-1111-1111-1111-111111111007', 'Restaurant Manager', now(), now())
ON CONFLICT (user_credential_id) DO NOTHING;

-- 4. SUPPORT_AGENT: support@foodie.local / FoodieSupport@444
INSERT INTO user_credential (id, phone_number, email, password_hash, user_type, active, created_at, updated_at) VALUES
    ('33333333-3333-3333-3333-333333333008', '+919999999994', 'support@foodie.local', '$2a$10$Xbl6anMbe2Jtvei6G3OhcuP6F8hPByNkopjjOFQV7RC5BBYeum2di', 'ADMIN', TRUE, now(), now())
ON CONFLICT (email) DO UPDATE SET password_hash = '$2a$10$Xbl6anMbe2Jtvei6G3OhcuP6F8hPByNkopjjOFQV7RC5BBYeum2di', updated_at = now();

INSERT INTO admin_user (id, user_credential_id, role_id, full_name, created_at, updated_at) VALUES
    ('44444444-4444-4444-4444-444444444008', '33333333-3333-3333-3333-333333333008', '11111111-1111-1111-1111-111111111008', 'Support Agent', now(), now())
ON CONFLICT (user_credential_id) DO NOTHING;

-- 5. AUDITOR: auditor@foodie.local / FoodieAuditor@555
INSERT INTO user_credential (id, phone_number, email, password_hash, user_type, active, created_at, updated_at) VALUES
    ('33333333-3333-3333-3333-333333333009', '+919999999993', 'auditor@foodie.local', '$2a$10$jIlkYTTADjJ98Ah2GuZN1Oa1dduPSi83xrzU3syfu2gqGiMqYQGy2', 'ADMIN', TRUE, now(), now())
ON CONFLICT (email) DO UPDATE SET password_hash = '$2a$10$jIlkYTTADjJ98Ah2GuZN1Oa1dduPSi83xrzU3syfu2gqGiMqYQGy2', updated_at = now();

INSERT INTO admin_user (id, user_credential_id, role_id, full_name, created_at, updated_at) VALUES
    ('44444444-4444-4444-4444-444444444009', '33333333-3333-3333-3333-333333333009', '11111111-1111-1111-1111-111111111009', 'Compliance Auditor', now(), now())
ON CONFLICT (user_credential_id) DO NOTHING;
