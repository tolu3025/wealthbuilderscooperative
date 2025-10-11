-- Add admin role to harflexdev@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('888d212f-8ab2-4866-97b2-560ad078028e', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;