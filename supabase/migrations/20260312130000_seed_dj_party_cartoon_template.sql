DO $$
DECLARE
  tmpl_id uuid;
BEGIN
  -- 1. Get existing template, or create it
  SELECT id INTO tmpl_id
  FROM public.templates
  WHERE name = 'DJ Party Cartoon - Birthday'
  LIMIT 1;

  IF tmpl_id IS NULL THEN
    INSERT INTO public.templates (name, category, realism, lang, is_active, created_by, poster_url, video_id)
    VALUES (
      'DJ Party Cartoon - Birthday',
      'birthday',
      'Cartoon',
      'en',
      true,
      COALESCE(
        (SELECT user_id FROM public.user_roles WHERE role = 'system_admin' LIMIT 1),
        '9f1987ec-cc05-48b2-a51a-946cca512008'
      ),
      'https://imagedelivery.net/y9xVFT-F6NamVdfDrKOTkw/942564a5-b8e9-4ebb-d48a-0fefec778200/public',
      '2a839242436c7ae35e9c0383a325c0ea'
    )
    RETURNING id INTO tmpl_id;
  END IF;

  -- 2. Replace scenes (DELETE + INSERT = idempotent)
  DELETE FROM public.template_scenes WHERE template_id = tmpl_id;

  INSERT INTO public.template_scenes (template_id, name, scene_order, reference_url, prompt, scene_type)
  VALUES
    (
      tmpl_id,
      'DJ mixer',
      0,
      'https://content.shuffll.com/template-assets/formats/holidays/DJ%20party%20cartoon/id.11_Party%20DJ_Cartoon_sh.01.jpeg',
      'Relight and re-color this image with colors from the provided logo.
high dynamic range, 8K, crisp details.',
      'single'
    ),
    (
      tmpl_id,
      'back of the DJ',
      1,
      'https://content.shuffll.com/template-assets/formats/holidays/DJ%20party%20cartoon/id.11_Party%20DJ_Cartoon_sh.02.jpeg',
      'Place an embroidered logo on the t-shirt from the provided image, keep this logo as is and don''t change anything with the logo layout, shapes, texts or colors. the logo text color can be in white for better contrast.
change the DJ''s shirt color to #XXXXXX
relight the scene with color adjustment from the provided logo. high dynamic range, 8K, crisp details.',
      'single'
    ),
    (
      tmpl_id,
      'crowed cheering',
      2,
      'https://content.shuffll.com/template-assets/formats/holidays/DJ%20party%20cartoon/id.11_Party%20DJ_Cartoon_sh.03.jpeg',
      'Relight and re-color this image with colors from the provided logo. high dynamic range, 8K, crisp details.',
      'single'
    ),
    (
      tmpl_id,
      'crowed dancing',
      3,
      'https://content.shuffll.com/template-assets/formats/holidays/DJ%20party%20cartoon/id.11_Party%20DJ_Cartoon_sh.04.jpeg',
      'show me this logo in the club''s background as a slightly dimmed led sign. slightly brighten the screen a bit for better contrast.
the logo text color can be in white for better contrast.
make sure the logo is fully integrated and projected in the led screen and is totally behind the crowd.
Relight and re-color this image with colors from the provided logo. high dynamic range, 8K, crisp details.',
      'single'
    ),
    (
      tmpl_id,
      'lights in brand color',
      4,
      'https://content.shuffll.com/template-assets/formats/holidays/DJ%20party%20cartoon/id.11_Party%20DJ_Cartoon_sh.05.jpeg',
      'Relight and re-color this image with colors from the provided logo. high dynamic range, 8K, crisp details.',
      'single'
    );

END $$;
