import { useState, useEffect } from 'react';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/shared/components/ui/card';
import type { IConnection, IConnectionFormData, TDbType } from '@/entities/connection';

const DEFAULT_PORTS: Record<TDbType, number> = {
  mysql: 3306,
  mariadb: 3306,
  postgresql: 5432,
};

interface ConnectionFormProps {
  initialData?: IConnection | null;
  onSave: (data: IConnectionFormData) => void;
  onTest: (data: IConnectionFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  isTesting?: boolean;
  testResult?: { success: boolean; message: string } | null;
}

export function ConnectionForm({
  initialData,
  onSave,
  onTest,
  onCancel,
  isLoading,
  isTesting,
  testResult,
}: ConnectionFormProps) {
  const [formData, setFormData] = useState<IConnectionFormData>({
    name: '',
    dbType: 'mysql',
    host: 'localhost',
    port: 3306,
    database: '',
    username: '',
    password: '',
    sslEnabled: false,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        dbType: initialData.dbType,
        host: initialData.host,
        port: initialData.port,
        database: initialData.database,
        username: initialData.username,
        password: '',
        sslEnabled: initialData.sslEnabled,
      });
    }
  }, [initialData]);

  function handleDbTypeChange(dbType: TDbType) {
    setFormData((prev) => ({
      ...prev,
      dbType,
      port: DEFAULT_PORTS[dbType],
    }));
  }

  function updateField<K extends keyof IConnectionFormData>(key: K, value: IConnectionFormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSave(formData);
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className="text-base">
            {initialData ? 'Edit Connection' : 'New Connection'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="conn-name" className="text-sm font-medium">Name</label>
            <Input
              id="conn-name"
              placeholder="Connection name"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="conn-dbtype" className="text-sm font-medium">Database Type</label>
            <Select
              id="conn-dbtype"
              value={formData.dbType}
              onChange={(e) => handleDbTypeChange(e.target.value as TDbType)}
            >
              <option value="mysql">MySQL</option>
              <option value="mariadb">MariaDB</option>
              <option value="postgresql">PostgreSQL</option>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1">
              <label htmlFor="conn-host" className="text-sm font-medium">Host</label>
              <Input
                id="conn-host"
                placeholder="localhost"
                value={formData.host}
                onChange={(e) => updateField('host', e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="conn-port" className="text-sm font-medium">Port</label>
              <Input
                id="conn-port"
                type="number"
                value={formData.port}
                onChange={(e) => updateField('port', Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="conn-database" className="text-sm font-medium">Database</label>
            <Input
              id="conn-database"
              placeholder="Database name"
              value={formData.database}
              onChange={(e) => updateField('database', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label htmlFor="conn-user" className="text-sm font-medium">Username</label>
              <Input
                id="conn-user"
                placeholder="Username"
                value={formData.username}
                onChange={(e) => updateField('username', e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="conn-pass" className="text-sm font-medium">Password</label>
              <Input
                id="conn-pass"
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => updateField('password', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="conn-ssl"
              type="checkbox"
              checked={formData.sslEnabled}
              onChange={(e) => updateField('sslEnabled', e.target.checked)}
              className="size-4 rounded border-input"
            />
            <label htmlFor="conn-ssl" className="text-sm font-medium">Enable SSL</label>
          </div>

          {testResult && (
            <p className={`text-sm ${testResult.success ? 'text-green-600' : 'text-destructive'}`}>
              {testResult.message}
            </p>
          )}
        </CardContent>
        <CardFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onTest(formData)}
            disabled={isTesting}
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </Button>
          <Button type="submit" size="sm" disabled={isLoading || !formData.name.trim()}>
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
