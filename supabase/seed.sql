-- Pricofee — semilla de métodos globales (owner_id null = visibles para todos)
insert into methods (owner_id, key, name, category, default_ratio, default_temp_c, grind_hint) values
  (null, 'espresso',     'Espresso',        'espresso',  2.0,  93, 'muy fino'),
  (null, 'moka',         'Moka',            'moka',      10.0, 95, 'fino-medio'),
  (null, 'v60',          'V60',             'pour_over', 16.0, 93, 'medio'),
  (null, 'aeropress',    'Aeropress',       'immersion', 14.0, 85, 'medio-fino'),
  (null, 'french_press', 'Prensa francesa', 'immersion', 15.0, 95, 'grueso'),
  (null, 'cold_brew',    'Cold Brew',       'cold',      8.0,  20, 'grueso'),
  (null, 'cold_drip',    'Cold Drip',       'cold',      12.0, 5,  'medio')
on conflict do nothing;
