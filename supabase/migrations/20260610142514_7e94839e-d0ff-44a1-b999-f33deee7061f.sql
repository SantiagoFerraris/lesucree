INSERT INTO public.site_settings (key, value) VALUES
  ('historia_parrafo_1', 'Le Sucrée Pastelería nació de mi pasión por la pastelería artesanal y del deseo de crear productos que transmitan sabor, dedicación y calidad en cada detalle. Detrás de cada elaboración hay ingredientes seleccionados, recetas caseras y una presentación cuidada para brindar una experiencia especial.'),
  ('historia_parrafo_2', 'Soy Julieta, Licenciada en Recursos Humanos, y esa formación me permitió desarrollar una mirada organizada, comprometida y enfocada en ofrecer siempre la mejor atención a cada cliente.'),
  ('historia_parrafo_3', 'Hoy, Le Sucrée Pastelería acompaña eventos y momentos cotidianos con productos artesanales hechos con pasión.'),
  ('valor_1_titulo', 'Artesanal'),
  ('valor_1_desc', 'Cada creación es elaborada a mano, con dedicación y atención al detalle.'),
  ('valor_2_titulo', 'Con Amor'),
  ('valor_2_desc', 'En cada receta dejo un pedacito de mí, porque sé que mis tortas acompañan momentos únicos y especiales.'),
  ('valor_3_titulo', 'Ingredientes Naturales'),
  ('valor_3_desc', 'Elijo uno a uno ingredientes frescos y nobles, para que cada bocado se sienta como un abrazo dulce.')
ON CONFLICT (key) DO NOTHING;