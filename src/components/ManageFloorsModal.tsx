import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit2, 
  Layers, 
  Check, 
  AlertCircle, 
  MoveUp, 
  MoveDown,
  Info
} from 'lucide-react';
import { RestaurantFloor } from '../types';
import { recordAuditLog } from '../services/adminService';

interface ManageFloorsModalProps {
  restaurantName: string;
  floors: RestaurantFloor[];
  onClose: () => void;
  onUpdateFloors: (updatedFloors: RestaurantFloor[]) => void;
  tableCountsByFloor: Record<string, number>;
}

export const ManageFloorsModal: React.FC<ManageFloorsModalProps> = ({
  restaurantName,
  floors,
  onClose,
  onUpdateFloors,
  tableCountsByFloor,
}) => {
  const [localFloors, setLocalFloors] = useState<RestaurantFloor[]>([...floors].sort((a, b) => a.order - b.order));
  const [floorCountInput, setFloorCountInput] = useState<number>(floors.length || 2);
  const [newFloorName, setNewFloorName] = useState('');
  const [newFloorDescription, setNewFloorDescription] = useState('');
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingDesc, setEditingDesc] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedFloorForObjects, setSelectedFloorForObjects] = useState<string>(localFloors[0]?.id || 'floor-0');

  // Generator matching specification:
  // Enter 3 -> Ground Floor, Floor 1, Floor 2
  // Enter 5 -> Ground Floor, Floor 1, Floor 2, Floor 3, Floor 4
  const handleGenerateByCount = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const count = Number(floorCountInput);
    if (!count || count < 1 || count > 15) {
      setErrorMsg('Please enter a valid number of floors between 1 and 15.');
      return;
    }

    const generated: RestaurantFloor[] = [];
    for (let i = 0; i < count; i++) {
      const existing = localFloors[i];
      const floorName = i === 0 ? 'Ground Floor' : `Floor ${i}`;
      generated.push({
        id: existing?.id || `floor-${i}-${Date.now().toString().slice(-4)}`,
        floorNumber: i,
        name: existing?.name || floorName,
        description: existing?.description || (i === 0 ? 'Ground level main dining & courtyard' : `Level ${i} dining space`),
        order: i,
        objects: existing?.objects || [
          { id: `obj-${i}-door`, floorId: `floor-${i}`, type: 'entrance', name: 'Main Entrance', x: 4, y: 50, width: 8, height: 12 },
          { id: `obj-${i}-kitchen`, floorId: `floor-${i}`, type: 'kitchen', name: 'Kitchen & Service', x: 80, y: 14, width: 16, height: 16 },
          { id: `obj-${i}-counter`, floorId: `floor-${i}`, type: 'counter', name: 'Host Counter', x: 12, y: 82, width: 16, height: 10 },
          { id: `obj-${i}-washroom`, floorId: `floor-${i}`, type: 'washroom', name: 'Washrooms', x: 80, y: 80, width: 14, height: 12 },
        ],
      });
    }

    setLocalFloors(generated);
    if (!generated.some((f) => f.id === selectedFloorForObjects)) {
      setSelectedFloorForObjects(generated[0]?.id || '');
    }
  };

  // Add a new dynamic floor
  const handleAddFloor = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const trimmed = newFloorName.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a floor name or number.');
      return;
    }

    if (localFloors.some((f) => f.name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg(`Floor named "${trimmed}" already exists.`);
      return;
    }

    const nextOrder = localFloors.length;
    const newFloor: RestaurantFloor = {
      id: `floor-${Date.now()}`,
      floorNumber: nextOrder,
      name: trimmed,
      description: newFloorDescription.trim() || `Level ${nextOrder} dining area`,
      order: nextOrder,
      objects: [
        { id: `obj-${nextOrder}-door`, floorId: `floor-${nextOrder}`, type: 'entrance', name: 'Entrance Door', x: 4, y: 50, width: 8, height: 12 },
        { id: `obj-${nextOrder}-counter`, floorId: `floor-${nextOrder}`, type: 'counter', name: 'Service Counter', x: 80, y: 80, width: 14, height: 10 },
      ],
    };

    const nextList = [...localFloors, newFloor];
    setLocalFloors(nextList);
    setFloorCountInput(nextList.length);
    setNewFloorName('');
    setNewFloorDescription('');
  };

  // Add architectural area/object to selected floor
  const handleAddObjectToFloor = (type: any, name: string) => {
    const targetFloor = localFloors.find((f) => f.id === selectedFloorForObjects);
    if (!targetFloor) return;

    const newObj = {
      id: `obj-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      floorId: targetFloor.id,
      type,
      name,
      x: Math.floor(Math.random() * 60) + 10,
      y: Math.floor(Math.random() * 60) + 10,
      width: 14,
      height: 12,
    };

    const currentObjects = targetFloor.objects || [];
    setLocalFloors((prev) =>
      prev.map((f) =>
        f.id === targetFloor.id
          ? { ...f, objects: [...currentObjects, newObj] }
          : f
      )
    );
  };

  // Remove architectural area/object from floor
  const handleRemoveObjectFromFloor = (floorId: string, objId: string) => {
    setLocalFloors((prev) =>
      prev.map((f) =>
        f.id === floorId
          ? { ...f, objects: (f.objects || []).filter((o) => o.id !== objId) }
          : f
      )
    );
  };

  // Start editing a floor
  const handleStartEdit = (fl: RestaurantFloor) => {
    setEditingFloorId(fl.id);
    setEditingName(fl.name);
    setEditingDesc(fl.description || '');
  };

  // Save floor name / description edits
  const handleSaveEdit = (floorId: string) => {
    if (!editingName.trim()) return;
    setLocalFloors((prev) =>
      prev.map((f) => (f.id === floorId ? { ...f, name: editingName.trim(), description: editingDesc.trim() } : f))
    );
    setEditingFloorId(null);
  };

  // Remove a floor
  const handleRemoveFloor = (floorId: string) => {
    if (localFloors.length <= 1) {
      setErrorMsg('The restaurant must have at least one active floor.');
      return;
    }

    const assignedCount = tableCountsByFloor[floorId] || 0;
    if (assignedCount > 0) {
      if (!window.confirm(`This floor has ${assignedCount} table(s) configured. Removing this floor will move its tables to the Ground Floor. Continue?`)) {
        return;
      }
    }

    const filtered = localFloors.filter((f) => f.id !== floorId);
    const reordered = filtered.map((f, idx) => ({
      ...f,
      order: idx,
      floorNumber: idx,
    }));
    setLocalFloors(reordered);
  };

  // Move floor up/down in order
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= localFloors.length) return;

    const copy = [...localFloors];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;

    const reordered = copy.map((f, idx) => ({
      ...f,
      order: idx,
      floorNumber: idx,
    }));
    setLocalFloors(reordered);
  };

  // Commit changes
  const handleSaveAll = () => {
    try {
      recordAuditLog({
        userId: 'USR-OWNER-CURRENT',
        userName: `${restaurantName} Owner`,
        userRole: 'restaurant-owner',
        action: 'floor_layout_saved',
        entityType: 'floor',
        entityId: `floors-${restaurantName}`,
        details: `Saved 2D floor layout for ${restaurantName}. Total ${localFloors.length} floor(s): ${localFloors.map((f) => f.name).join(', ')}.`,
      });
    } catch {}

    onUpdateFloors(localFloors);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl border border-[#E8E6E1] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-[#E8E6E1] flex items-center justify-between bg-[#FAF9F6]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#4F6F52]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#4F6F52]">
                Architectural Layout
              </span>
            </div>
            <h3 className="text-xl font-bold font-serif text-[#2C3333] mt-0.5">
              Configure Restaurant Floors
            </h3>
            <p className="text-xs text-[#2C3333]/60">
              Manage physical floors for <span className="font-semibold text-[#2C3333]">{restaurantName}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-[#E8E6E1] flex items-center justify-center text-[#2C3333]/60 hover:text-[#2C3333] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-[#2C3333]">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 4: Number of Floors Auto-Generation Card */}
          <div className="p-4 rounded-2xl bg-white border border-[#E8E6E1] shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#4F6F52] flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#4F6F52]" />
                  Number of Floors Setup
                </span>
                <p className="text-[11px] text-[#2C3333]/60 mt-0.5">
                  Enter total floors in your restaurant (e.g. 3 generates Ground Floor, Floor 1, Floor 2)
                </p>
              </div>
            </div>

            <form onSubmit={handleGenerateByCount} className="flex items-center gap-2.5">
              <div className="flex-1">
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={floorCountInput}
                  onChange={(e) => setFloorCountInput(Number(e.target.value) || 1)}
                  className="w-full px-3.5 py-2 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl text-xs font-bold text-[#2C3333] focus:border-[#4F6F52] outline-none"
                  placeholder="Number of Floors (e.g. 3)"
                  id="input-number-of-floors"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-[#4F6F52] hover:bg-[#3D5A40] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-2xs cursor-pointer whitespace-nowrap"
                id="btn-generate-floors"
              >
                Set Floors
              </button>
            </form>
          </div>

          {/* Section 5: 2D Floor Architectural Areas & Objects Configurator */}
          <div className="p-4 rounded-2xl bg-white border border-[#E8E6E1] shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#2C3333] flex items-center gap-1.5">
                  <span>2D Layout Objects for Floor:</span>
                </span>
                <p className="text-[11px] text-[#2C3333]/60 mt-0.5">
                  Add and arrange doors, entrance, windows, counters, kitchen, washrooms per floor
                </p>
              </div>
              
              <select
                value={selectedFloorForObjects}
                onChange={(e) => setSelectedFloorForObjects(e.target.value)}
                className="px-2.5 py-1.5 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl text-xs font-bold text-[#4F6F52] outline-none cursor-pointer"
              >
                {localFloors.map((fl) => (
                  <option key={fl.id} value={fl.id}>
                    {fl.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick add object buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {[
                { type: 'entrance', label: '+ Entrance' },
                { type: 'door', label: '+ Door' },
                { type: 'window', label: '+ Window' },
                { type: 'counter', label: '+ Counter' },
                { type: 'kitchen', label: '+ Kitchen' },
                { type: 'washroom', label: '+ Washroom' },
                { type: 'bar', label: '+ Bar' },
              ].map((btn) => (
                <button
                  key={btn.type}
                  type="button"
                  onClick={() => handleAddObjectToFloor(btn.type, btn.label.replace('+ ', ''))}
                  className="px-2.5 py-1 rounded-lg bg-[#FAF9F6] hover:bg-stone-100 border border-[#E8E6E1] text-[11px] font-semibold text-[#2C3333] transition-colors cursor-pointer"
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Current objects on this floor */}
            {(() => {
              const activeFloorObj = localFloors.find((f) => f.id === selectedFloorForObjects);
              const objects = activeFloorObj?.objects || [];

              return (
                <div className="mt-2 space-y-1.5 max-h-32 overflow-y-auto">
                  {objects.length === 0 ? (
                    <p className="text-[11px] text-stone-400 italic">No custom objects added yet.</p>
                  ) : (
                    objects.map((obj) => (
                      <div
                        key={obj.id}
                        className="px-2.5 py-1.5 rounded-lg bg-[#FAF9F6] border border-[#E8E6E1] flex items-center justify-between text-[11px]"
                      >
                        <span className="font-medium text-[#2C3333]">
                          {obj.name} <span className="text-stone-400">({obj.type})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveObjectFromFloor(selectedFloorForObjects, obj.id)}
                          className="text-rose-600 hover:text-rose-800 p-0.5"
                          title="Remove Object"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              );
            })()}
          </div>

          {/* List of current floors */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2C3333]/70">
                Active Floors ({localFloors.length})
              </span>
              <span className="text-[11px] text-stone-500">Order from ground upwards</span>
            </div>

            <div className="space-y-2">
              {localFloors.map((fl, idx) => {
                const isEditing = editingFloorId === fl.id;
                const tableCount = tableCountsByFloor[fl.id] || 0;

                return (
                  <div
                    key={fl.id}
                    className="p-3.5 rounded-2xl border border-[#E8E6E1] bg-white hover:border-[#4F6F52]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    {isEditing ? (
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          placeholder="Floor Name"
                          className="w-full px-3 py-1.5 bg-[#FAF9F6] border border-[#4F6F52] rounded-xl text-xs font-bold text-[#2C3333] focus:outline-none"
                        />
                        <input
                          type="text"
                          value={editingDesc}
                          onChange={(e) => setEditingDesc(e.target.value)}
                          placeholder="Description (optional)"
                          className="w-full px-3 py-1.5 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl text-xs text-[#2C3333] focus:outline-none"
                        />
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(fl.id)}
                            className="px-3 py-1 rounded-lg bg-[#4F6F52] text-white text-xs font-bold cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingFloorId(null)}
                            className="px-3 py-1 rounded-lg bg-stone-100 text-stone-700 text-xs font-medium cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#4F6F521A] text-[#4F6F52] font-bold text-xs flex items-center justify-center shrink-0 border border-[#4F6F52]/20">
                          {fl.floorNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#2C3333]">{fl.name}</span>
                            <span className="text-[10px] font-semibold bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full border border-stone-200">
                              {tableCount} {tableCount === 1 ? 'Table' : 'Tables'}
                            </span>
                          </div>
                          {fl.description && (
                            <p className="text-[11px] text-[#2C3333]/60 mt-0.5">{fl.description}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {!isEditing && (
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMove(idx, 'up')}
                          className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-30 cursor-pointer"
                          title="Move Floor Down/Earlier"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === localFloors.length - 1}
                          onClick={() => handleMove(idx, 'down')}
                          className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-30 cursor-pointer"
                          title="Move Floor Up/Higher"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(fl)}
                          className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer"
                          title="Rename Floor"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFloor(fl.id)}
                          disabled={localFloors.length <= 1}
                          className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-30 cursor-pointer"
                          title="Remove Floor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Floor Section */}
          <form onSubmit={handleAddFloor} className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2C3333]/70 block flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-[#4F6F52]" />
              <span>Add Another Floor</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={newFloorName}
                onChange={(e) => setNewFloorName(e.target.value)}
                placeholder="e.g. 2nd Floor, Rooftop Lounge"
                className="w-full px-3.5 py-2 bg-white border border-[#E8E6E1] rounded-xl text-xs font-semibold text-[#2C3333] focus:outline-none focus:border-[#4F6F52]"
              />
              <input
                type="text"
                value={newFloorDescription}
                onChange={(e) => setNewFloorDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full px-3.5 py-2 bg-white border border-[#E8E6E1] rounded-xl text-xs text-[#2C3333] focus:outline-none focus:border-[#4F6F52]"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#4F6F52] hover:bg-[#3D5A40] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Floor</span>
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#E8E6E1] flex items-center justify-end gap-3 bg-[#FAF9F6]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-[#E8E6E1] text-[#2C3333]/70 font-semibold text-xs hover:bg-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="px-6 py-2.5 rounded-xl bg-[#4F6F52] hover:bg-[#3D563F] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            <Check className="w-4 h-4" />
            <span>Save Floor Layout</span>
          </button>
        </div>
      </div>
    </div>
  );
};
