insert into system_settings(key,value,description)
select 'registration_requires_code',value,'Require a valid North access code before a new account can be created.'
from system_settings where key='registration.require_access_code'
on conflict(key) do update set value=case when system_settings.value='true'::jsonb or excluded.value='true'::jsonb then 'true'::jsonb else 'false'::jsonb end;

insert into system_settings(key,value,description)
select 'maintenance_mode',value,'Temporarily prevent normal member writes while owner administration remains available.'
from system_settings where key='system.maintenance_mode'
on conflict(key) do nothing;

delete from system_settings where key in ('registration.require_access_code','system.maintenance_mode');
