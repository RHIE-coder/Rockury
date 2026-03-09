import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import type { IConnection, IConnectionFormData, IConnectionTestResult, TDbType } from '@/entities/connection';
import { connectionApi } from '../api/connectionApi';

const DEFAULT_PORTS: Record<TDbType, number> = {
  mysql: 3306,
  mariadb: 3306,
  postgresql: 5432,
  sqlite: 0,
};

const IS_FILE_BASED: Record<TDbType, boolean> = {
  mysql: false,
  mariadb: false,
  postgresql: false,
  sqlite: true,
};

interface ConnectionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: IConnection | null;
  initialPassword?: string;
  onSave: (data: IConnectionFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConnectionForm({
  open,
  onOpenChange,
  initialData,
  initialPassword = '',
  onSave,
  onCancel,
  isLoading,
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
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<IConnectionTestResult | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setFormData({
        name: initialData.name,
        dbType: initialData.dbType,
        host: initialData.host,
        port: initialData.port,
        database: initialData.database,
        username: initialData.username,
        password: initialPassword,
        sslEnabled: initialData.sslEnabled,
      });
    } else {
      setFormData({
        name: '',
        dbType: 'mysql',
        host: 'localhost',
        port: 3306,
        database: '',
        username: '',
        password: '',
        sslEnabled: false,
      });
    }
    setShowPassword(false);
    setTestResult(null);
  }, [open, initialData, initialPassword]);

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

  async function handleTest() {
    setTestResult(null);
    setIsTesting(true);
    try {
      const result = await connectionApi.test(formData) as { success: boolean; data: IConnectionTestResult | null; error?: string };
      if (result.success && result.data) {
        setTestResult(result.data);
      } else {
        setTestResult({ success: false, message: result.error ?? 'Connection test failed' });
      }
    } catch (err) {
      setTestResult({ success: false, message: (err as Error).message });
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {initialData ? 'Edit Connection' : 'New Connection'}
            </DialogTitle>
            <DialogDescription>
              {initialData
                ? 'Update the connection details below.'
                : 'Fill in the details to create a new database connection.'}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-3">
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
                <option value="sqlite">SQLite</option>
              </Select>
            </div>

            {IS_FILE_BASED[formData.dbType] ? (
              <div className="space-y-1">
                <label htmlFor="conn-database" className="text-sm font-medium">Database File</label>
                <Input
                  id="conn-database"
                  placeholder="/path/to/database.db"
                  value={formData.database}
                  onChange={(e) => updateField('database', e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">SQLite database file path</p>
              </div>
            ) : (
              <>
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
                    <div className="relative">
                      <Input
                        id="conn-pass"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        value={formData.password}
                        onChange={(e) => updateField('password', e.target.value)}
                        className="pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
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
              </>
            )}

            {testResult && (
              <div className={`rounded-md border px-3 py-2 text-sm ${testResult.success ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400'}`}>
                <p className="font-medium">{testResult.success ? 'Connection successful' : 'Connection failed'}</p>
                <p className="text-xs opacity-80">{testResult.message}</p>
                {testResult.serverVersion && (
                  <p className="text-xs opacity-80">Server: {testResult.serverVersion}</p>
                )}
                {testResult.latencyMs !== undefined && (
                  <p className="text-xs opacity-80">Latency: {testResult.latencyMs}ms</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={isTesting}
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isLoading || !formData.name.trim()}>
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
