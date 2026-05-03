CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (user_id, username, full_name, email)
    VALUES (
        NEW.id,
        LEFT(
          REGEXP_REPLACE(
            COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
            '[^a-zA-Z0-9_.\-]', '', 'g'
          ),
          50
        ),
        LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), 100),
        NEW.email
    );

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'employee');

    RETURN NEW;
END;
$function$;