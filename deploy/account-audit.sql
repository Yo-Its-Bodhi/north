select u.id, c.username, u.display_name, u.is_admin, u.status, u.created_at, count(d.document_key) as synced_documents
from app_users u
join local_credentials c on c.owner_user_id = u.id
left join sync_documents d on d.owner_user_id = u.id
group by u.id, c.username, u.display_name, u.is_admin, u.status, u.created_at
order by u.created_at;

select lower(username::text) as normalized_username, count(*)
from local_credentials
group by lower(username::text)
having count(*) > 1;

select display_name, count(*)
from app_users
group by display_name
having count(*) > 1;

select status, count(*) from sync_conflicts group by status order by status;
select count(*) as registered_devices, count(*) filter (where revoked_at is not null) as revoked_devices from devices;
