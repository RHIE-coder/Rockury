import { Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { usePackages, useCreatePackage, useUpdatePackage, useDeletePackage } from '../model/usePackages';
import { usePackageStore } from '../model/packageStore';
import { PackageCard } from './PackageCard';
import { PackageForm } from './PackageForm';

export function PackageList() {
  const { data: packages, isLoading, error } = usePackages();
  const createPackage = useCreatePackage();
  const updatePackage = useUpdatePackage();
  const deletePackage = useDeletePackage();
  const { isFormOpen, editingPackageId, openForm, closeForm } = usePackageStore();

  const editingPackage = editingPackageId
    ? packages?.find((p) => p.id === editingPackageId) ?? null
    : null;

  function handleSave(data: { name: string; description: string }) {
    if (editingPackageId) {
      updatePackage.mutate({ id: editingPackageId, ...data }, { onSuccess: () => closeForm() });
    } else {
      createPackage.mutate(data, { onSuccess: () => closeForm() });
    }
  }

  function handleDelete(id: string) {
    if (window.confirm('Are you sure you want to delete this package?')) {
      deletePackage.mutate(id);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading packages...</p>;
  }

  if (error) {
    return <p className="text-sm text-destructive">Failed to load packages.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Packages</h2>
        <Button size="sm" onClick={() => openForm()}>
          <Plus className="size-4" />
          New Package
        </Button>
      </div>

      {isFormOpen && (
        <PackageForm
          initialData={editingPackage}
          onSave={handleSave}
          onCancel={closeForm}
          isLoading={createPackage.isPending || updatePackage.isPending}
        />
      )}

      {packages && packages.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              onEdit={(id) => openForm(id)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No packages yet. Create one to get started.</p>
      )}
    </div>
  );
}
