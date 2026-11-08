-- Enable realtime INSERT events for recorded journey GPS positions.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'journey_location_updates'
  ) then
    alter publication supabase_realtime
      add table public.journey_location_updates;
  end if;
end
$$;
