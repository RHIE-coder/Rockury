import { useState, useEffect } from 'react';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Button } from '@/shared/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/shared/components/ui/card';
import type { IPackage } from '@/entities/package';

interface PackageFormProps {
  initialData?: IPackage | null;
  onSave: (data: { name: string; description: string }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function PackageForm({ initialData, onSave, onCancel, isLoading }: PackageFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description);
    }
  }, [initialData]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim() });
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className="text-base">
            {initialData ? 'Edit Package' : 'New Package'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="pkg-name" className="text-sm font-medium">Name</label>
            <Input
              id="pkg-name"
              placeholder="Package name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="pkg-desc" className="text-sm font-medium">Description</label>
            <Textarea
              id="pkg-desc"
              placeholder="Package description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
        <CardFooter className="gap-2">
          <Button type="submit" size="sm" disabled={isLoading || !name.trim()}>
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
