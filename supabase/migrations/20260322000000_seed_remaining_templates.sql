-- Seed remaining 5 templates from Google Sheets source data
-- Idempotent: finds-or-creates each template, then DELETE+re-INSERT scenes
-- created_by = Isaac (system admin seed UUID)

-- ============================================================
-- 1. VAN CARTOON – PASSOVER
-- ============================================================
DO $$
DECLARE tmpl_id uuid;
BEGIN
  SELECT id INTO tmpl_id FROM public.templates WHERE name = 'Van cartoon - passover' LIMIT 1;

  IF tmpl_id IS NULL THEN
    INSERT INTO public.templates (name, category, event_type, realism, lang, is_active, created_by)
    VALUES ('Van cartoon - passover', 'holiday', 'Passover', 'Cartoon', 'he', true,
            '9f1987ec-cc05-48b2-a51a-946cca512008')
    RETURNING id INTO tmpl_id;
  END IF;

  DELETE FROM public.template_scenes WHERE template_id = tmpl_id;

  INSERT INTO public.template_scenes (template_id, name, scene_order, reference_url, prompt, video_prompt, scene_type) VALUES

  (tmpl_id, 'branded character', 0,
   'https://content.shuffll.com/template-assets/formats/holidays/van%20cartoon/cartoon-brown-bear-dressed-base.png',
   'Place an embroidered logo on the hat from the provided image, keep this logo as is and don''t change anything with the logo layout, shapes, texts or colors. change the t-shirt color to this brand''s hex numbers #XXXXXX',
   'Character slowly turns toward camera, smiles warmly and gives a friendly wave. Soft ambient sound only. No talking, no cuts, no transitions, no morphing, no warping, no time jumps, no scene changes, no subject duplication, no face/body deformation. high dynamic range, 8K, crisp details.',
   'single'),

  (tmpl_id, 'branded van', 1,
   'https://content.shuffll.com/template-assets/formats/holidays/van%20cartoon/sc.01-1.png',
   'place this character in the van, the character is looking directly at the road.
Place the logo on the side of the van from the provided image, keep this logo as is and don''t change anything with the logo layout, shapes, texts or colors. high dynamic range, 8K, crisp details.',
   'Van drives along a bright sunny road. Character is visible through windshield, smiling and looking ahead. Camera follows from the side at a steady pace. Ambient road sounds only. No talking, no cuts, no transitions, no morphing, no warping, no time jumps, no scene changes, no subject duplication, no face/body deformation. high dynamic range, 8K, crisp details.',
   'single'),

  (tmpl_id, 'Radio', 2,
   'https://content.shuffll.com/template-assets/formats/holidays/van%20cartoon/sc.02-4.png',
   '',
   'Radio display pulses gently with a soft glow. Subtle bouncing equalizer bars. Warm ambient music sound. Completely static camera. No talking, no cuts, no transitions, no morphing, no warping, no time jumps, no scene changes, no subject duplication, no face/body deformation. high dynamic range, 8K, crisp details.',
   'single'),

  (tmpl_id, 'happy character', 3,
   'https://content.shuffll.com/template-assets/formats/holidays/van%20cartoon/sc.03-1.png',
   'place this character at the drivers seat in the van, the character is looking directly at the camera.
the characters face is happily ecstatic. high dynamic range, 8K, crisp details.',
   'Character bounces excitedly in the driver''s seat, looks directly at camera with a big happy expression, then gives an enthusiastic thumbs up. Ambient sound only. No talking, no cuts, no transitions, no morphing, no warping, no time jumps, no scene changes, no subject duplication, no face/body deformation. high dynamic range, 8K, crisp details.',
   'single'),

  (tmpl_id, 'industry brand', 4,
   null,
   'place this character in a dancing pose inside a Pixar-quality minimal themed set for {sector-1} industry. Monochrome backdrop in #XXXXXX with soft studio gradient. Simplified geometric forms with premium materials (satin plastic, brushed metal accents). Subtle brand: #YYYYYY floor trim. Soft area light; clean shadows; no text; no motion. high dynamic range, 8K, crisp details.',
   'Character dances playfully in place with smooth looping motion. Subtle brand-colored ambient lighting pulses softly in sync with movement. No talking, no cuts, no transitions, no morphing, no warping, no time jumps, no scene changes, no subject duplication, no face/body deformation. high dynamic range, 8K, crisp details.',
   'single'),

  (tmpl_id, 'party with sign', 5,
   null,
   'place this character in a Pixar-quality disco club. Mirror ball, colored beams, light haze, glossy floor reflections, soft crowd silhouettes in back. Subtle brand colors touch #XXXXXX #YYYYYY, neon strip along wall. the character is wearing styled disco party clothes and holding a styled creative sign in both hands, the sign reads in Hebrew "חג שמח". high dynamic range, 8K, crisp details.',
   'Character dances joyfully holding the sign, showing it to camera. Disco lights flash rhythmically in brand colors. Mirror ball spins above. Crowd silhouettes sway in the background. No talking, no cuts, no transitions, no morphing, no warping, no time jumps, no scene changes, no subject duplication, no face/body deformation. high dynamic range, 8K, crisp details.',
   'single'),

  (tmpl_id, 'confetti area', 6,
   null,
   'a Pixar-quality empty disco club. Mirror ball, colored beams, light haze, glossy floor reflections. Subtle brand colors touch #XXXXXX #YYYYYY, neon strip along wall. Background bokeh confetti. no text, no motion. high dynamic range, 8K, crisp details.',
   'Confetti falls slowly and gracefully from above. Disco ball rotates casting moving light spots. Colored beams sweep across the floor. Ambient club atmosphere sounds. No talking, no cuts, no transitions, no morphing, no warping, no time jumps, no scene changes, no subject duplication, no face/body deformation. high dynamic range, 8K, crisp details.',
   'single');

END $$;


-- ============================================================
-- 2. WAREHOUSE ROBOT
-- ============================================================
DO $$
DECLARE tmpl_id uuid;
BEGIN
  SELECT id INTO tmpl_id FROM public.templates WHERE name = 'warehouse robot' LIMIT 1;

  IF tmpl_id IS NULL THEN
    INSERT INTO public.templates (name, category, realism, lang, is_active, created_by)
    VALUES ('warehouse robot', 'corporate', 'Realistic', 'en', true,
            '9f1987ec-cc05-48b2-a51a-946cca512008')
    RETURNING id INTO tmpl_id;
  END IF;

  DELETE FROM public.template_scenes WHERE template_id = tmpl_id;

  INSERT INTO public.template_scenes (template_id, name, scene_order, reference_url, prompt, video_prompt, scene_type) VALUES

  (tmpl_id, 'robot first frame', 0,
   'https://content.shuffll.com/template-assets/formats/holidays/robot/scene-base-01%20(1).png',
   'Add this logo as an embedded element on the box, and adjust the column colors to align with the brand color #XXXXXX #YYYYYY',
   'The robot drives slowly and steadily towards the camera along a warehouse aisle. No talking, only ambient warehouse sound effects. No cuts, no transitions, no morphing, no warping, no time jumps, no scene changes, no subject duplication, no face/body deformation. high dynamic range, 8K, crisp details.',
   'first_frame'),

  (tmpl_id, 'robot last frame', 1,
   'https://content.shuffll.com/template-assets/formats/holidays/robot/scene-base-02%20(1).png',
   'Add this logo as an embedded element on the box, and adjust the column colors to align with the brand color #XXXXXX #YYYYYY',
   null,
   'last_frame'),

  (tmpl_id, 'warehouse', 2,
   'https://content.shuffll.com/template-assets/formats/holidays/robot/image%20-%202026-02-08T173746.324.png',
   'Whenever there is a logo, replace it with the attached logo. All logos in the image should use the new one.',
   'Static wide-angle shot. Ambient warehouse sounds — subtle hum of machinery, distant forklifts. Gentle background motion of conveyor belts. No talking, no cuts, no transitions, no morphing, no warping, no time jumps, no scene changes, no subject duplication. high dynamic range, 8K, crisp details.',
   'single');

END $$;


-- ============================================================
-- 3. WAREHOUSE ROBOT – BIRTHDAY
-- ============================================================
DO $$
DECLARE tmpl_id uuid;
BEGIN
  SELECT id INTO tmpl_id FROM public.templates WHERE name = 'warehouse robot - birthday' LIMIT 1;

  IF tmpl_id IS NULL THEN
    INSERT INTO public.templates (name, category, event_type, realism, lang, is_active, created_by)
    VALUES ('warehouse robot - birthday', 'birthday', 'Birthday', 'Realistic', 'en', true,
            '9f1987ec-cc05-48b2-a51a-946cca512008')
    RETURNING id INTO tmpl_id;
  END IF;

  DELETE FROM public.template_scenes WHERE template_id = tmpl_id;

  INSERT INTO public.template_scenes (template_id, name, scene_order, reference_url, prompt, video_prompt, scene_type) VALUES

  (tmpl_id, 'robot first frame', 0,
   'https://content.shuffll.com/template-assets/formats/holidays/robot/scene-base-01%20(1).png',
   'Add this logo as an embedded element on the box, and adjust the column colors to align with the brand color #XXXXXX #YYYYYY',
   'The robot drives slowly and steadily towards the camera along a warehouse aisle. No talking, only ambient warehouse sound effects. No cuts, no transitions, no morphing, no warping, no time jumps, no scene changes, no subject duplication, no face/body deformation. high dynamic range, 8K, crisp details.',
   'first_frame'),

  (tmpl_id, 'robot last frame', 1,
   'https://content.shuffll.com/template-assets/formats/holidays/robot/scene-base-02%20(1).png',
   'Add this logo as an embedded element on the box, and adjust the column colors to align with the brand color #XXXXXX #YYYYYY',
   null,
   'last_frame'),

  (tmpl_id, 'warehouse', 2,
   'https://content.shuffll.com/template-assets/formats/holidays/robot/image%20-%202026-02-08T173746.324.png',
   'Whenever there is a logo, replace it with the attached logo. All logos in the image should use the new one.',
   'Static wide-angle shot. Ambient warehouse sounds — subtle hum of machinery, distant forklifts. Gentle background motion of conveyor belts. No talking, no cuts, no transitions, no morphing, no warping, no time jumps, no scene changes, no subject duplication. high dynamic range, 8K, crisp details.',
   'single');

END $$;


-- ============================================================
-- 4. GIFT TRUCK
-- ============================================================
DO $$
DECLARE tmpl_id uuid;
BEGIN
  SELECT id INTO tmpl_id FROM public.templates WHERE name = 'gift truck' LIMIT 1;

  IF tmpl_id IS NULL THEN
    INSERT INTO public.templates (name, category, realism, lang, is_active, created_by)
    VALUES ('gift truck', 'corporate', 'Realistic', 'en', true,
            '9f1987ec-cc05-48b2-a51a-946cca512008')
    RETURNING id INTO tmpl_id;
  END IF;

  DELETE FROM public.template_scenes WHERE template_id = tmpl_id;

  INSERT INTO public.template_scenes (template_id, name, scene_order, reference_url, prompt, video_prompt, scene_type) VALUES

  (tmpl_id, 'recolor truck', 0,
   'https://content.shuffll.com/template-assets/formats/holidays/gift%20truck/id.06_Gift-Truck_sc.01.jpeg',
   'recolor the truck with #XXXXXX color. replace the "LOGO" placeholder with the provided logo in white color, keep the provided logo proportions. match to logo size to maximum logo placeholder width. high dynamic range, 8K, crisp details.',
   'Camera slowly tracks left and eases to a complete stop. The truck is driving along a city street, speeds up and exits the frame from the left. The driver smiles and nods to the camera. No music, no dialogue, no talking, no cuts, no transitions, no morphing, no warping, no time jumps, no scene changes, no subject duplication, no face/body deformation. high dynamic range, 8K, crisp details.',
   'single'),

  (tmpl_id, 'first frame to scene 2', 1,
   'https://content.shuffll.com/template-assets/formats/holidays/gift%20truck/id.06_Gift-Truck_sc.02-start.jpeg',
   'recolor the truck with #XXXXXX color. replace the "LOGO" placeholder with the provided logo in white color, keep the provided logo proportions. match to logo size to maximum logo placeholder width. high dynamic range, 8K, crisp details.',
   'Static camera. All the gift boxes drop naturally into place with no boxes falling to the ground or outside the truck, forming a large pile in the back of the truck. The driver smiles and nods to the camera. The truck drives to the left almost exiting the frame. No music, no dialogue, no talking, no cuts, no transitions, no morphing, no warping, no time jumps, no scene changes, no subject duplication, no face/body deformation. high dynamic range, 8K, crisp details.',
   'first_frame'),

  (tmpl_id, 'last frame to scene 2', 2,
   'https://content.shuffll.com/template-assets/formats/holidays/gift%20truck/id.06_Gift-Truck_sc.02-end%20(1).jpeg',
   'recolor the truck with #XXXXXX color. replace "LOGO" placeholder with the provided logo in white color, keep the provided logo proportions. match to logo size to maximum logo placeholder width. recolor the gifts wrapping and ribbons to the following color scheme #YYYYYY #ZZZZZZ high dynamic range, 8K, crisp details.',
   null,
   'last_frame'),

  (tmpl_id, 'scene 3', 3,
   'https://content.shuffll.com/template-assets/formats/holidays/gift%20truck/id.06_Gift-Truck_sc.03.jpeg',
   'recolor the truck with #XXXXXX color. replace "LOGO" placeholder with the provided logo in white color, keep the provided logo proportions. match to logo size to maximum logo placeholder width. recolor the gifts wrapping and ribbons to the following color scheme #YYYYYY #ZZZZZZ high dynamic range, 8K, crisp details.',
   'Static camera. The boxes continuously and naturally move with extremely subtle bounce in place, as if on the back of a driving truck. All boxes keep their form and position without falling. No music, no dialogue, no talking, no cuts, no transitions, no morphing, no warping, no time jumps, no scene changes, no subject duplication, no face/body deformation. high dynamic range, 8K, crisp details.',
   'single'),

  (tmpl_id, 'scene 4', 4,
   'https://content.shuffll.com/template-assets/formats/holidays/gift%20truck/id.06_Gift-Truck_sc.04.jpeg',
   'recolor the gifts wrapping and ribbons to the following color scheme #YYYYYY #ZZZZZZ high dynamic range, 8K, crisp details.',
   'Static camera. Gift boxes gently shimmer with a festive glow. Subtle ribbon flutter as if a light breeze passes through. No music, no dialogue, no talking, no cuts, no transitions, no morphing, no warping, no time jumps, no scene changes, no subject duplication, no face/body deformation. high dynamic range, 8K, crisp details.',
   'single');

END $$;


-- ============================================================
-- 5. ELEVATOR GIFT
-- ============================================================
DO $$
DECLARE tmpl_id uuid;
BEGIN
  SELECT id INTO tmpl_id FROM public.templates WHERE name = 'Elevator gift' LIMIT 1;

  IF tmpl_id IS NULL THEN
    INSERT INTO public.templates (name, category, realism, lang, is_active, created_by)
    VALUES ('Elevator gift', 'corporate', 'Realistic', 'en', true,
            '9f1987ec-cc05-48b2-a51a-946cca512008')
    RETURNING id INTO tmpl_id;
  END IF;

  DELETE FROM public.template_scenes WHERE template_id = tmpl_id;

  INSERT INTO public.template_scenes (template_id, name, scene_order, reference_url, prompt, video_prompt, scene_type) VALUES

  (tmpl_id, 'people', 0,
   'https://content.shuffll.com/template-assets/formats/holidays/Elevator%20gift/Elevator-Gift_Base_sc.01.jpeg',
   'recolor the gifts wrapping and ribbons to the following color scheme #XXXXXX #YYYYYY #ZZZZZZ high dynamic range, 8K, crisp details.',
   'Static camera. Static elevator cabin. The people are minding their own business — looking at phones, standing quietly. No music, no dialogue, no talking, no cuts, no transitions, no morphing, no warping, no time jumps, no scene changes, no subject duplication, no face/body deformation. high dynamic range, 8K, crisp details.',
   'single'),

  (tmpl_id, 'first frame to scene 2', 1,
   'https://content.shuffll.com/template-assets/formats/holidays/Elevator%20gift/Elevator-Gift_Base_sc.02-end%20(1).jpeg',
   'replace "LOGO" placeholder with the provided logo in full color, keep the provided logo proportions. match to logo size to maximum logo placeholder height. recolor the gifts wrapping and ribbons to the following color scheme #XXXXXX #YYYYYY #ZZZZZZ high dynamic range, 8K, crisp details.',
   'Cinematic dolly-in camera movement for 6 seconds with a slow ease. After 1 second the elevator doors open, immediately revealing all the people in the elevator who are extremely happy, smiling, dancing and enjoying themselves. They all stay inside the elevator the entire time. Only ambient sound and joyful reactions are hearable. No music, no dialogue, no talking, no cuts, no transitions, no morphing, no warping, no time jumps, no scene changes, no subject duplication, no face/body deformation. high dynamic range, 8K, crisp details.',
   'first_frame'),

  (tmpl_id, 'last frame to scene 2', 2,
   'https://content.shuffll.com/template-assets/formats/holidays/Elevator%20gift/Elevator-Gift_Base_sc.02-start.jpeg',
   'replace "LOGO" placeholder with the provided logo in full color, keep the provided logo proportions. match to logo size to maximum logo placeholder height.',
   null,
   'last_frame'),

  (tmpl_id, 'only elevator button', 3,
   'https://content.shuffll.com/template-assets/formats/holidays/Elevator%20gift/Elevator-Gift_Base_sc.03.jpeg',
   '',
   'Completely static camera. A female hand enters from the right and presses the round button. After the button is pressed the hand exits the frame. When the button is pressed, only the outer LED rings light up in #XXXXXX color and blink continuously, fading in and out. No music, no dialogue, no talking, no cuts, no transitions, no morphing, no warping, no time jumps, no scene changes, no subject duplication, no face/body deformation. high dynamic range, 8K, crisp details.',
   'single');

END $$;
