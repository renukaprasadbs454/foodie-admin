'use client';

import React, { useState } from 'react';

export function SupportQuestionsBanner() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [meetingDate, setMeetingDate] = useState('2025-08-15');
  const [topic, setTopic] = useState('Vendor Onboarding & Commission Strategy');
  const [booked, setBooked] = useState(false);

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    setBooked(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setBooked(false);
      setName('');
      setEmail('');
    }, 2000);
  };

  return (
    <div style={{ position: 'relative', marginTop: 28, marginBottom: 28 }}>
      {/* Banner Container */}
      <div
        style={{
          background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
          borderRadius: 20,
          padding: '36px 44px',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 24,
          boxShadow: '0 4px 20px rgba(33, 150, 243, 0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Left Text & CTA */}
        <div style={{ maxWidth: 520, zIndex: 2 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
            Still Have Questions?
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.9)', marginTop: 10, lineHeight: 1.6 }}>
            Book a meeting with our Foodie marketplace operations specialists and discuss your queries.
          </p>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            style={{
              marginTop: 18,
              padding: '10px 24px',
              backgroundColor: '#FFFFFF',
              color: '#2196F3',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            Book Now
          </button>
        </div>

        {/* Right Graphic Illustration */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            padding: '20px 28px',
            borderRadius: 16,
            border: '1px solid rgba(255, 255, 255, 0.35)',
            zIndex: 2,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>1-on-1 Operations Call</div>
            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.85)', marginTop: 4 }}>30-min strategy session with Foodie experts</div>
          </div>
        </div>

        {/* Floating Side Tab: Upcoming Features */}
        <button
          type="button"
          onClick={() => setIsRoadmapOpen(true)}
          style={{
            position: 'absolute',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%) rotate(-90deg)',
            transformOrigin: 'bottom right',
            backgroundColor: '#FFFFFF',
            color: '#2196F3',
            padding: '7px 14px',
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            border: '1px solid #E5E7EB',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            zIndex: 3,
            boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.08)',
          }}
        >
          Upcoming Features
        </button>
      </div>

      {/* Book Meeting Modal */}
      {isModalOpen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              maxWidth: 480,
              width: '100%',
              padding: 28,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
              border: '1px solid #E5E7EB',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
                Schedule Foodie Operations Consultation
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6B7280' }}
              >
                ×
              </button>
            </div>

            {booked ? (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <h4 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginTop: 12 }}>
                  Meeting Successfully Booked!
                </h4>
                <p style={{ fontSize: 13, color: '#6B7280' }}>
                  A calendar invite has been dispatched to {email || 'your email'}. Our specialist looks forward to speaking with you!
                </p>
              </div>
            ) : (
              <form onSubmit={handleBook} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#4B5563' }}>Your Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Morgan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', color: '#111827', marginTop: 4, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#4B5563' }}>Business Email</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. alex@foodie.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', color: '#111827', marginTop: 4, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#4B5563' }}>Preferred Consultation Date</label>
                  <input
                    type="date"
                    required
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', color: '#111827', marginTop: 4, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#4B5563' }}>Discussion Topic</label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', color: '#111827', marginTop: 4, outline: 'none' }}
                  >
                    <option>Vendor Onboarding & Commission Strategy</option>
                    <option>Delivery Fleet Logistics & Dynamic Surge Pricing</option>
                    <option>Food Quality Moderation & Customer Review Policies</option>
                    <option>Promo Campaign Vouchers & Marketing Growth</option>
                  </select>
                </div>
                <button
                  type="submit"
                  style={{
                    marginTop: 10,
                    padding: '12px',
                    background: 'linear-gradient(135deg, #2196F3 0%, #64D8FF 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(33, 150, 243, 0.25)',
                  }}
                >
                  Confirm Booking 
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}

      {/* Upcoming Features Drawer */}
      {isRoadmapOpen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setIsRoadmapOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 420,
              backgroundColor: '#FFFFFF',
              height: '100%',
              padding: 28,
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              borderLeft: '1px solid #E5E7EB',
              boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.08)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB', paddingBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
                Upcoming Foodie Features Roadmap
              </h3>
              <button
                type="button"
                onClick={() => setIsRoadmapOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6B7280' }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { title: 'AI Multilingual Order Voice Bot', status: 'Q4 2025', desc: 'Allows customers to speak complex food orders directly in native languages.' },
                { title: 'Autonomous Drone Delivery Dispatch', status: 'Q1 2026', desc: 'Integration with automated aerial food delivery route planners.' },
                { title: 'Thermal Kitchen Heatmap Analytics', status: 'In Progress', desc: 'Real-time kitchen prep bottle-neck diagnostics for cloud kitchens.' },
              ].map((f) => (
                <div key={f.title} style={{ padding: 16, borderRadius: 12, backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{f.title}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#2196F3', backgroundColor: '#E3F2FD', border: '1px solid #BFDBFE', padding: '2px 8px', borderRadius: 12 }}>{f.status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 6, lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
