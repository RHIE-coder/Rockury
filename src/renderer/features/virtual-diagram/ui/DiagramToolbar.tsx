import { useState } from 'react';
import { Plus, Code, PanelLeft, PanelRight, Search, SlidersHorizontal, Camera } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import type { IDiagram } from '~/shared/types/db';
import { useDiagramStore } from '../model/diagramStore';
import type { TDiagramTab } from '../model/diagramStore';

const TABS: { key: TDiagramTab; label: string }[] = [
  { key: 'virtual', label: 'Virtual' },
  { key: 'real', label: 'Real' },
  { key: 'diff', label: 'Diff' },
];

interface DiagramToolbarProps {
  diagrams: IDiagram[] | undefined;
  currentDiagram: IDiagram | undefined;
  onDiagramSelect: (id: string) => void;
  onDiagramCreate: () => void;
  onDiagramNameChange?: (name: string) => void;
  onDiagramVersionChange?: (version: string) => void;
  onAddTable?: () => void;
}

export function DiagramToolbar({
  diagrams,
  currentDiagram,
  onDiagramSelect,
  onDiagramCreate,
  onDiagramNameChange,
  onDiagramVersionChange,
  onAddTable,
}: DiagramToolbarProps) {
  const {
    selectedDiagramId,
    activeTab,
    setActiveTab,
    isDdlEditorOpen,
    toggleDdlEditor,
    isLeftPanelOpen,
    toggleLeftPanel,
    isRightPanelOpen,
    toggleRightPanel,
    isSearchOpen,
    setSearchOpen,
    filter,
    setFilterPreset,
  } = useDiagramStore();

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [isEditingVersion, setIsEditingVersion] = useState(false);
  const [editVersion, setEditVersion] = useState('');

  function handleNameDoubleClick() {
    if (!currentDiagram || !onDiagramNameChange) return;
    setEditName(currentDiagram.name);
    setIsEditingName(true);
  }

  function handleNameSubmit() {
    if (editName.trim() && onDiagramNameChange) {
      onDiagramNameChange(editName.trim());
    }
    setIsEditingName(false);
  }

  function handleNameKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleNameSubmit();
    if (e.key === 'Escape') setIsEditingName(false);
  }

  function handleVersionClick() {
    if (!currentDiagram || !onDiagramVersionChange) return;
    setEditVersion(currentDiagram.version ?? '1.0.0');
    setIsEditingVersion(true);
  }

  function handleVersionSubmit() {
    if (editVersion.trim() && onDiagramVersionChange) {
      onDiagramVersionChange(editVersion.trim());
    }
    setIsEditingVersion(false);
  }

  function handleVersionKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleVersionSubmit();
    if (e.key === 'Escape') setIsEditingVersion(false);
  }

  return (
    <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
      {/* Left section: Diagram selector + name + version */}
      <div className="flex items-center gap-2">
        <Select
          className="h-7 w-40 text-xs"
          value={selectedDiagramId ?? ''}
          onChange={(e) => onDiagramSelect(e.target.value)}
        >
          <option value="">Select diagram...</option>
          {diagrams?.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>

        <Button variant="ghost" size="xs" onClick={onDiagramCreate} title="New diagram">
          <Plus className="size-3.5" />
        </Button>

        {currentDiagram && (
          <>
            <div className="h-4 w-px bg-border" />
            {isEditingName ? (
              <Input
                className="h-7 w-36 text-xs font-semibold"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleNameSubmit}
                onKeyDown={handleNameKeyDown}
                autoFocus
              />
            ) : (
              <span
                className="cursor-pointer text-sm font-semibold hover:text-primary"
                onDoubleClick={handleNameDoubleClick}
                title="Double-click to rename"
              >
                {currentDiagram.name}
              </span>
            )}

            {/* Version badge */}
            {isEditingVersion ? (
              <Input
                className="h-6 w-20 text-center text-[10px]"
                value={editVersion}
                onChange={(e) => setEditVersion(e.target.value)}
                onBlur={handleVersionSubmit}
                onKeyDown={handleVersionKeyDown}
                autoFocus
              />
            ) : (
              <button
                type="button"
                onClick={handleVersionClick}
                className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                title="Click to edit version"
              >
                v{currentDiagram.version ?? '1.0.0'}
              </button>
            )}
          </>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Center: Tabs */}
      <div className="flex rounded-md border border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1 text-xs transition-colors ${
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right section: Action buttons */}
      <div className="flex items-center gap-1">
        {activeTab === 'virtual' && onAddTable && currentDiagram && (
          <Button variant="ghost" size="xs" onClick={onAddTable} title="Add table">
            <Plus className="size-3.5" />
            Table
          </Button>
        )}

        <Button
          variant="ghost"
          size="xs"
          onClick={() => setSearchOpen(!isSearchOpen)}
          title="Search (Cmd+F)"
        >
          <Search className="size-3.5" />
        </Button>

        {/* Filter preset selector */}
        <div className="relative">
          <Button
            variant={isFilterOpen ? 'secondary' : 'ghost'}
            size="xs"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            title="Filter preset"
          >
            <SlidersHorizontal className="size-3.5" />
          </Button>
          {isFilterOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-32 rounded-md border border-border bg-popover p-1 shadow-md">
              {(['compact', 'full', 'custom'] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setFilterPreset(preset);
                    setIsFilterOpen(false);
                  }}
                  className={`w-full rounded-sm px-2 py-1 text-left text-xs hover:bg-accent ${
                    filter.preset === preset ? 'bg-accent font-medium' : ''
                  }`}
                >
                  {preset.charAt(0).toUpperCase() + preset.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button variant="ghost" size="xs" title="Snapshot (coming soon)" disabled>
          <Camera className="size-3.5" />
        </Button>

        <Button
          variant={isLeftPanelOpen ? 'secondary' : 'ghost'}
          size="xs"
          onClick={toggleLeftPanel}
          title="Toggle left panel"
        >
          <PanelLeft className="size-3.5" />
        </Button>

        <Button
          variant={isRightPanelOpen ? 'secondary' : 'ghost'}
          size="xs"
          onClick={toggleRightPanel}
          title="Toggle right panel"
        >
          <PanelRight className="size-3.5" />
        </Button>

        <div className="h-4 w-px bg-border" />

        <Button
          variant={isDdlEditorOpen ? 'secondary' : 'ghost'}
          size="xs"
          onClick={toggleDdlEditor}
          title="DDL Editor"
        >
          <Code className="size-3.5" />
          DDL
        </Button>
      </div>
    </div>
  );
}
