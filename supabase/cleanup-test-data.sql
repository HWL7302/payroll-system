begin;

create temporary table cleanup_tax_document_paths as
select pdf_storage_path
from public.tax_documents
where pdf_storage_path is not null
  and pdf_storage_path <> '';

delete from storage.objects
where bucket_id in ('tax-documents', 'tax-document', 'tax_documents')
  and (
    name in (select pdf_storage_path from cleanup_tax_document_paths)
    or (bucket_id || '/' || name) in (select pdf_storage_path from cleanup_tax_document_paths)
  );

delete from public.tax_documents;
delete from public.payroll_records;

drop table cleanup_tax_document_paths;

commit;

select
  (select count(*) from public.employees) as employees_count,
  (select count(*) from public.payroll_records) as payroll_records_count,
  (select count(*) from public.tax_documents) as tax_documents_count,
  (
    select count(*)
    from storage.objects
    where bucket_id in ('tax-documents', 'tax-document', 'tax_documents')
  ) as tax_document_storage_objects_count;
