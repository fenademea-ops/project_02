'use client';

import { useState } from 'react';
import { useStore } from '@/lib/useStore';
import { formatDate } from '@/lib/format';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import {
  Bell,
  Plus,
  Power,
  Trash2,
  Edit,
  Users,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function AdminAnnouncementsPage() {
  const {
    announcements,
    createAnnouncementAction,
    toggleAnnouncementAction,
    editAnnouncementAction,
    deleteAnnouncementAction,
    showToast,
  } = useStore();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all');
  const [loading, setLoading] = useState(false);

  // Edit modal
  const [editModalAnn, setEditModalAnn] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', message: '', targetAudience: 'all' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast('Please provide both title and message', 'error');
      return;
    }

    setLoading(true);
    const res = createAnnouncementAction({
      title: title.trim(),
      message: message.trim(),
      targetAudience: audience,
    });
    setLoading(false);

    if (res.success) {
      setTitle('');
      setMessage('');
      setAudience('all');
    }
  };

  const openEditModal = (ann) => {
    setEditModalAnn(ann);
    setEditForm({
      title: ann.title,
      message: ann.message,
      targetAudience: ann.targetAudience || 'all',
    });
  };

  const handleSaveEdit = () => {
    if (!editModalAnn) return;
    if (!editForm.title.trim() || !editForm.message.trim()) {
      showToast('Please provide both title and message', 'error');
      return;
    }

    setLoading(true);
    const res = editAnnouncementAction(editModalAnn.id, {
      title: editForm.title.trim(),
      message: editForm.message.trim(),
      targetAudience: editForm.targetAudience,
    });
    setLoading(false);

    if (res.success) {
      setEditModalAnn(null);
    }
  };

  const handleDelete = (annId) => {
    if (confirm('Are you sure you want to delete this broadcast announcement?')) {
      deleteAnnouncementAction(annId);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <Bell className="w-7 h-7 text-rose-500" />
          Broadcast Announcements ({announcements.length})
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Publish system-wide alert banners to visitors, renters, and hosts across Sheggar Wheels.
        </p>
      </div>

      {/* Create Announcement Form */}
      <form
        onSubmit={handleSubmit}
        className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm"
      >
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-emerald-400" />
          Create New Platform Announcement
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1">Banner Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 🌧️ Rainy Season Notice, 🎉 Weekend Special"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-rose-500 min-h-[40px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Target Audience
            </label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-rose-500 min-h-[40px]"
            >
              <option value="all">All Demo Users</option>
              <option value="renters">Renters Only</option>
              <option value="hosts">Hosts Only</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Announcement Message *
          </label>
          <textarea
            rows={2}
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Brief notice text shown on the global header or dashboard banners..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            className="bg-emerald-600 hover:bg-emerald-500 font-bold"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Publish Active Banner
          </Button>
        </div>
      </form>

      {/* Announcements List */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Existing Announcements
        </h2>

        {announcements.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-500">
            No announcements created yet.
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-white">{ann.title}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        ann.active
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}
                    >
                      {ann.active ? 'Active on site' : 'Inactive'}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-full capitalize">
                      Audience: {ann.targetAudience || 'All Users'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{ann.message}</p>
                  <span className="text-[10px] text-slate-500 block">
                    Posted on {formatDate(ann.createdAt)}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(ann)}
                    className="text-xs text-slate-300 border-slate-700"
                  >
                    <Edit className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAnnouncementAction(ann.id)}
                    className="text-xs"
                  >
                    <Power className="w-3.5 h-3.5 mr-1" />
                    {ann.active ? 'Deactivate' : 'Activate'}
                  </Button>

                  <button
                    onClick={() => handleDelete(ann.id)}
                    title="Delete Announcement"
                    className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Announcement Modal */}
      <Modal
        isOpen={!!editModalAnn}
        onClose={() => setEditModalAnn(null)}
        title="Edit Platform Announcement"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Banner Title *
            </label>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Audience
            </label>
            <select
              value={editForm.targetAudience}
              onChange={(e) => setEditForm({ ...editForm, targetAudience: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            >
              <option value="all">All Demo Users</option>
              <option value="renters">Renters Only</option>
              <option value="hosts">Hosts Only</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Message Content *
            </label>
            <textarea
              rows={3}
              value={editForm.message}
              onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setEditModalAnn(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={loading}
              onClick={handleSaveEdit}
              className="bg-rose-600 hover:bg-rose-500"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
