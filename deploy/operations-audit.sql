update backup_runs
set status='failed', error_message='Initial backup status-recording test was superseded', finished_at=now()
where status='running' and started_at < now() - interval '2 minutes';

select filename,status,size_bytes,encrypted,verified_at,error_message,started_at,finished_at
from backup_runs order by started_at desc limit 10;

select filename,applied_at from schema_migrations order by applied_at desc limit 10;

select severity,category,count(*) from operational_events group by severity,category order by severity,category;

select job_name,status,details,error_message,started_at,finished_at from job_runs order by started_at desc limit 10;

select method,route,status_code,round(duration_ms,1) duration_ms,occurred_at from api_request_logs order by occurred_at desc limit 20;
