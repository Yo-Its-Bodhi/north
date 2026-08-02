begin;

alter table health_records
  drop constraint health_records_record_type_check;

alter table health_records
  add constraint health_records_record_type_check
  check (record_type in ('steps','heart_rate','sleep','exercise','distance','active_calories','total_calories','daily_summary','weight'));

commit;