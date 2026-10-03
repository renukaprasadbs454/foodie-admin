'use client';

import React, { useState } from 'react';
import type { SocialMediaLink, SocialMediaStatus } from '../types/socialMediaTypes';
import { SOCIAL_MEDIA_OPTIONS } from '../types/socialMediaTypes';

const INITIAL_LINKS: SocialMediaLink[] = [
  {
    id: 'sm-1',
    sl: 1,
    name: 'pinterest',
    link: 'https://www.pinterest.com/login/',
    status: 'ACTIVE',
  },
  {
    id: 'sm-2',
    sl: 2,
    name: 'linkedin',
    link: 'https://www.linkedin.com',
    status: 'ACTIVE',
  },
  {
    id: 'sm-3',
    sl: 3,
    name: 'facebook',
    link: 'https://www.facebook.com/',
    status: 'ACTIVE',
  },
];

const PLATFORM_ICONS: Record<string, string> = {
  pinterest: '',
  linkedin: '',
  facebook: '',
  instagram: '',
  youtube: '',
  twitter: '',
  tiktok: '',
};

export function SocialMediaStudio() {
  const [socialLinks, setSocialLinks] = useState<SocialMediaLink[]>(INITIAL_LINKS);
  const [selectedName, setSelectedName] = useState<string>('');
  const [inputLink, setInputLink] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleReset = () => {
    setSelectedName('');
    setInputLink('');
    setEditingId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedName) {
      alert('Please select a Social Media Name');
      return;
    }
    if (!inputLink.trim()) {
      alert('Please enter a valid Social Media Link');
      return;
    }

    if (editingId) {
      setSocialLinks((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? { ...item, name: selectedName, link: inputLink.trim() }
            : item
        )
      );
      showToast(`Updated social media link for ${selectedName}`);
    } else {
      const newEntry: SocialMediaLink = {
        id: `sm-${Date.now()}`,
        sl: socialLinks.length + 1,
        name: selectedName,
        link: inputLink.trim(),
        status: 'ACTIVE',
      };
      setSocialLinks((prev) => [...prev, newEntry]);
      showToast(`Added ${selectedName} social media link`);
    }

    handleReset();
  };

  const handleToggleStatus = (id: string) => {
    setSocialLinks((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStatus: SocialMediaStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
          return { ...item, status: nextStatus };
        }
        return item;
      })
    );
    showToast('Social media link status updated');
  };

  const handleEdit = (item: SocialMediaLink) => {
    setEditingId(item.id);
    setSelectedName(item.name);
    setInputLink(item.link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Toast Alert */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
            color: '#FFFFFF',
            padding: '12px 24px',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            boxShadow: '0 10px 30px rgba(33, 150, 243, 0.3)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
              Social Media
            </h1>
          </div>
          <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0 0 0' }}>
            Configure official social media links, customer channel URLs, and active display toggles
          </p>
        </div>
      </div>

      {/* Form Card */}
      <form
        onSubmit={handleSave}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          border: '1px solid #E5E7EB',
          padding: '24px 28px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Social Media Name Select */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
              Social Media Name
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={selectedName}
                onChange={(e) => setSelectedName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '1px solid #E5E7EB',
                  backgroundColor: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: 500,
                  color: selectedName ? '#111827' : '#6B7280',
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                }}
              >
                <option value="">Select Platform</option>
                {SOCIAL_MEDIA_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} style={{ color: '#111827' }}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6B7280', fontSize: 12 }}>
                ▼
              </span>
            </div>
          </div>

          {/* Social Media Link Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
              Social Media Link
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={inputLink}
              onChange={(e) => setInputLink(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 10,
                border: '1px solid #E5E7EB',
                backgroundColor: '#FFFFFF',
                fontSize: 14,
                color: '#111827',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, marginTop: 4 }}>
          <button
            type="button"
            onClick={handleReset}
            style={{
              padding: '10px 24px',
              backgroundColor: '#F9FAFB',
              color: '#374151',
              border: '1px solid #E5E7EB',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Reset
          </button>
          <button
            type="submit"
            style={{
              padding: '10px 36px',
              background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(33, 150, 243, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            {editingId ? 'Update' : 'Save'}
          </button>
        </div>
      </form>

      {/* Table Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E5E7EB' }}>
                <th style={{ padding: '14px 20px', width: 80 }}>SL</th>
                <th style={{ padding: '14px 20px', width: 220 }}>Name</th>
                <th style={{ padding: '14px 20px' }}>Link</th>
                <th style={{ padding: '14px 20px', width: 140 }}>Status</th>
                <th style={{ padding: '14px 20px', width: 120 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {socialLinks.map((item, index) => {
                const isActive = item.status === 'ACTIVE';
                const isEditingThis = editingId === item.id;
                const icon = PLATFORM_ICONS[item.name.toLowerCase()] || '';

                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid #F3F4F6',
                      backgroundColor: isEditingThis ? '#F9FAFB' : 'transparent',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '14px 20px', color: '#6B7280', fontWeight: 600 }}>
                      {index + 1}
                    </td>

                    <td style={{ padding: '14px 20px', color: '#111827', fontWeight: 600, textTransform: 'capitalize' }}>
                      {icon && <span style={{ marginRight: 8 }}>{icon}</span>}
                      <span>{item.name}</span>
                    </td>

                    <td style={{ padding: '14px 20px' }}>
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#2196F3', fontWeight: 500, textDecoration: 'none', wordBreak: 'break-all' }}
                      >
                        {item.link}
                      </a>
                    </td>

                    {/* Toggle Switch */}
                    <td style={{ padding: '14px 20px' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item.id)}
                        aria-label={`Toggle ${item.name} status`}
                        style={{
                          width: 44,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: isActive ? '#2196F3' : '#E5E7EB',
                          border: 'none',
                          padding: 2,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: isActive ? 'flex-end' : 'flex-start',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            backgroundColor: '#FFFFFF',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                          }}
                        />
                      </button>
                    </td>

                    {/* Edit Action */}
                    <td style={{ padding: '14px 20px' }}>
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        title="Edit Social Media Link"
                        style={{
                          padding: '6px 14px',
                          borderRadius: 8,
                          border: 'none',
                          backgroundColor: isEditingThis ? '#2196F3' : '#E3F2FD',
                          color: isEditingThis ? '#FFFFFF' : '#2196F3',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
