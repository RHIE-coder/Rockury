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
  const { activePackageId, setActivePackageId, isFormOpen, editingPackageId, openForm, closeForm } = usePackageStore();

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
      if (activePackageId === id) setActivePackageId(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-semibold">Packages</span>
        <Button variant="ghost" size="icon" className="size-6" onClick={() => openForm()}>
          <Plus className="size-3.5" />
        </Button>
      </div>

      {isFormOpen && (
        <div className="border-b border-border p-3">
          <PackageForm
            initialData={editingPackage}
            onSave={handleSave}
            onCancel={closeForm}
            isLoading={createPackage.isPending || updatePackage.isPending}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <p className="p-3 text-xs text-muted-foreground">Loading...</p>
        )}
        {error && (
          <p className="p-3 text-xs text-destructive">Failed to load packages.</p>
        )}
        {packages && packages.length === 0 && (
          <p className="p-3 text-xs text-muted-foreground">No packages yet.</p>
        )}
        {packages?.map((pkg) => (
          <PackageCard
            key={pkg.id}
            pkg={pkg}
            isActive={pkg.id === activePackageId}
            onSelect={() => setActivePackageId(pkg.id)}
            onEdit={(id) => openForm(id)}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
