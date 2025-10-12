-- Add admin role to toluwanimioyetade@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('8cd632c1-04a4-49cf-a791-5a66d5d837bd', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;