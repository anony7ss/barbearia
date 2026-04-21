insert into public.business_settings (
  id,
  business_name,
  timezone,
  min_notice_minutes,
  max_advance_days,
  cancellation_limit_minutes,
  reschedule_limit_minutes,
  slot_interval_minutes,
  default_buffer_minutes,
  whatsapp_phone,
  email,
  address
) values (
  true,
  'Corte Nobre Barbearia',
  'America/Sao_Paulo',
  120,
  30,
  240,
  240,
  15,
  0,
  '5511955550137',
  'agenda@cortenobre.com.br',
  'Rua Oscar Freire, 742 - Jardins, Sao Paulo - SP'
) on conflict (id) do update set
  business_name = excluded.business_name,
  timezone = excluded.timezone,
  min_notice_minutes = excluded.min_notice_minutes,
  max_advance_days = excluded.max_advance_days,
  cancellation_limit_minutes = excluded.cancellation_limit_minutes,
  reschedule_limit_minutes = excluded.reschedule_limit_minutes,
  slot_interval_minutes = excluded.slot_interval_minutes,
  default_buffer_minutes = excluded.default_buffer_minutes,
  whatsapp_phone = excluded.whatsapp_phone,
  email = excluded.email,
  address = excluded.address;

insert into public.services (id, slug, name, description, duration_minutes, buffer_minutes, price_cents, is_active, display_order)
values
  ('11111111-1111-4111-8111-111111111111', 'corte-executivo', 'Corte Executivo', 'Corte alinhado ao seu estilo, finalizado com lavagem e styling discreto.', 45, 0, 9000, true, 10),
  ('11111111-1111-4111-8111-111111111112', 'barba-classica', 'Barba Classica', 'Toalha quente, desenho preciso, navalha e hidratacao para acabamento limpo.', 35, 0, 7000, true, 20),
  ('11111111-1111-4111-8111-111111111113', 'corte-barba', 'Corte + Barba', 'Experiencia completa para sair pronto: cabelo, barba e acabamento.', 75, 0, 14500, true, 30),
  ('11111111-1111-4111-8111-111111111114', 'sobrancelha', 'Sobrancelha', 'Limpeza e alinhamento natural para reforcar expressao sem exagero.', 15, 0, 3000, true, 40),
  ('11111111-1111-4111-8111-111111111115', 'pigmentacao-barba', 'Pigmentacao de Barba', 'Correcoes pontuais e preenchimento com acabamento natural e sobrio.', 50, 0, 11000, true, 50),
  ('11111111-1111-4111-8111-111111111116', 'dia-do-noivo', 'Dia do Noivo', 'Atendimento reservado com cabelo, barba, cuidados faciais e finalizacao.', 120, 0, 26000, true, 60)
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  description = excluded.description,
  duration_minutes = excluded.duration_minutes,
  buffer_minutes = excluded.buffer_minutes,
  price_cents = excluded.price_cents,
  is_active = excluded.is_active,
  display_order = excluded.display_order;

insert into public.barbers (id, name, slug, bio, specialties, photo_url, is_featured, is_active, display_order)
values
  ('22222222-2222-4222-8222-222222222221', 'Rafael Monteiro', 'rafael-monteiro', 'Precisao de salao europeu com leitura moderna do rosto masculino.', array['Degrade baixo', 'Tesoura', 'Barba alinhada'], 'https://images.unsplash.com/photo-1556760544-74068565f05c?auto=format&fit=crop&w=900&q=82', true, true, 10),
  ('22222222-2222-4222-8222-222222222222', 'Diego Santana', 'diego-santana', 'Cria cortes que respeitam rotina, textura e personalidade.', array['Corte texturizado', 'Cacheados', 'Design de barba'], 'https://images.unsplash.com/photo-1622288432450-277d0fef5ed6?auto=format&fit=crop&w=900&q=82', false, true, 20),
  ('22222222-2222-4222-8222-222222222223', 'Marcos Vieira', 'marcos-vieira', 'Foco em conforto, simetria e acabamento impecavel.', array['Barba premium', 'Navalha', 'Acabamento executivo'], 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&w=900&q=82', false, true, 30)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  bio = excluded.bio,
  specialties = excluded.specialties,
  photo_url = excluded.photo_url,
  is_featured = excluded.is_featured,
  is_active = excluded.is_active,
  display_order = excluded.display_order;

insert into public.availability_rules (barber_id, weekday, start_time, end_time, break_start, break_end, is_active)
select barber_id, weekday, start_time::time, end_time::time, break_start::time, break_end::time, true
from (
  values
    (null::uuid, 1, '09:00', '20:00', '13:00', '14:00'),
    (null::uuid, 2, '09:00', '20:00', '13:00', '14:00'),
    (null::uuid, 3, '09:00', '20:00', '13:00', '14:00'),
    (null::uuid, 4, '09:00', '20:00', '13:00', '14:00'),
    (null::uuid, 5, '09:00', '20:00', '13:00', '14:00'),
    (null::uuid, 6, '09:00', '18:00', '13:00', '14:00')
) as seed(barber_id, weekday, start_time, end_time, break_start, break_end)
where not exists (
  select 1
  from public.availability_rules ar
  where ar.barber_id is not distinct from seed.barber_id
    and ar.weekday = seed.weekday
    and ar.start_time = seed.start_time::time
    and ar.end_time = seed.end_time::time
);
