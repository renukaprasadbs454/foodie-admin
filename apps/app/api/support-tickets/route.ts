import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface ChatMessage {
  id: string;
  enquiryId: string;
  sender: 'customer' | 'admin';
  senderName: string;
  message: string;
  timestamp: string;
}

export interface EnquiryRecord {
  id: string;
  category: 'CUSTOMER' | 'RESTAURANT' | 'DELIVERY' | 'GENERAL';
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  subject: string;
  message: string;
  timestamp: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  replyMessage?: string;
  messages?: ChatMessage[];
  resolvedAt?: string;
  orderId?: string;
}

const INITIAL_ENQUIRIES: EnquiryRecord[] = [
  {
    id: 'ENQ-901',
    category: 'CUSTOMER',
    senderName: 'Customer',
    senderEmail: 'customer@foodie.com',
    senderPhone: '+91 80731 12274',
    subject: 'Delayed Refund for Order #ORD-9821',
    message: "I was debited ₹450 for a cancelled order yesterday but haven't received refund in my bank account.",
    timestamp: '15 mins ago',
    status: 'OPEN',
    priority: 'HIGH',
    orderId: 'ORD-9821',
    messages: [
      {
        id: 'msg-101',
        enquiryId: 'ENQ-901',
        sender: 'customer',
        senderName: 'Customer',
        message: "I was debited ₹450 for a cancelled order yesterday but haven't received refund in my bank account.",
        timestamp: '15 mins ago',
      },
    ],
  },
  {
    id: 'ENQ-902',
    category: 'CUSTOMER',
    senderName: 'Vikram Mehta',
    senderEmail: 'vikram.m@yahoo.com',
    senderPhone: '+91 98123 45678',
    subject: 'Unable to apply promo code WELCOME100',
    message: 'The promo code states invalid even though I am placing my first order.',
    timestamp: '40 mins ago',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    replyMessage: 'Our tech team is validating your first order eligibility status.',
    messages: [
      {
        id: 'msg-201',
        enquiryId: 'ENQ-902',
        sender: 'customer',
        senderName: 'Vikram Mehta',
        message: 'The promo code states invalid even though I am placing my first order.',
        timestamp: '40 mins ago',
      },
      {
        id: 'msg-202',
        enquiryId: 'ENQ-902',
        sender: 'admin',
        senderName: 'Admin Support',
        message: 'Our tech team is validating your first order eligibility status.',
        timestamp: '25 mins ago',
      },
    ],
  },
  {
    id: 'ENQ-903',
    category: 'RESTAURANT',
    senderName: 'Rajesh Gupta (Royal Biryani)',
    senderEmail: 'contact@royalbiryani.in',
    senderPhone: '+91 99001 88776',
    subject: 'Request to update menu prices & commission statement',
    message: 'We have updated our GST details and require our weekly commission payout report.',
    timestamp: '1 hour ago',
    status: 'OPEN',
    priority: 'MEDIUM',
    messages: [
      {
        id: 'msg-301',
        enquiryId: 'ENQ-903',
        sender: 'customer',
        senderName: 'Rajesh Gupta (Royal Biryani)',
        message: 'We have updated our GST details and require our weekly commission payout report.',
        timestamp: '1 hour ago',
      },
    ],
  },
  {
    id: 'ENQ-904',
    category: 'DELIVERY',
    senderName: 'Ramesh Kumar (Rider #DRV-402)',
    senderEmail: 'ramesh.rider@gmail.com',
    senderPhone: '+91 97400 33211',
    subject: 'Rain Surge Payout Incentive Not Credited',
    message: 'I completed 12 orders during rain surge hours in Indiranagar yesterday. Rain bonus ₹300 is missing.',
    timestamp: '2 hours ago',
    status: 'OPEN',
    priority: 'HIGH',
    messages: [
      {
        id: 'msg-401',
        enquiryId: 'ENQ-904',
        sender: 'customer',
        senderName: 'Ramesh Kumar (Rider #DRV-402)',
        message: 'I completed 12 orders during rain surge hours in Indiranagar yesterday. Rain bonus ₹300 is missing.',
        timestamp: '2 hours ago',
      },
    ],
  },
  {
    id: 'ENQ-905',
    category: 'GENERAL',
    senderName: 'Sanjay Kapoor (TechCrunch)',
    senderEmail: 'sanjay@techcrunch.com',
    senderPhone: '+91 98222 11000',
    subject: 'Media & Franchise Partnership Inquiry',
    message: 'Interested in featuring Foodie Hyperlocal Platform in our upcoming startup ecosystem report.',
    timestamp: '3 hours ago',
    status: 'OPEN',
    priority: 'LOW',
    messages: [
      {
        id: 'msg-501',
        enquiryId: 'ENQ-905',
        sender: 'customer',
        senderName: 'Sanjay Kapoor',
        message: 'Interested in featuring Foodie Hyperlocal Platform in our upcoming startup ecosystem report.',
        timestamp: '3 hours ago',
      },
    ],
  },
];

const STORE_FILE = path.join(os.tmpdir(), 'foodie_support_enquiries_v6.json');

function sanitizeStore(data: EnquiryRecord[]): EnquiryRecord[] {
  if (!Array.isArray(data)) return INITIAL_ENQUIRIES;
  return data.filter((item) => item && typeof item.id === 'string' && item.id.startsWith('ENQ-'));
}

function readStore(): EnquiryRecord[] {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const content = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned = sanitizeStore(parsed);
        if (!cleaned.some(item => item.id === 'ENQ-901')) {
          cleaned.unshift(INITIAL_ENQUIRIES[0]);
        }
        if (!cleaned.some(item => item.id === 'ENQ-902')) {
          cleaned.push(INITIAL_ENQUIRIES[1]);
        }
        return cleaned;
      }
    }
  } catch (e) {}

  writeStore(INITIAL_ENQUIRIES);
  return INITIAL_ENQUIRIES;
}

function writeStore(data: EnquiryRecord[]) {
  try {
    const cleaned = sanitizeStore(data);
    fs.writeFileSync(STORE_FILE, JSON.stringify(cleaned, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write support store', e);
  }
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: CORS_HEADERS });
}

export async function GET() {
  const data = readStore();
  return NextResponse.json(
    {
      success: true,
      data,
      meta: { timestamp: new Date().toISOString() },
    },
    { status: 200, headers: CORS_HEADERS }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let data = readStore();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (body.action === 'sync_all' && Array.isArray(body.data)) {
      writeStore(body.data);
      return NextResponse.json(
        {
          success: true,
          data: body.data,
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // Explicit Status / Resolve Action
    if (body.action === 'status' || body.action === 'resolve') {
      const ticketId = body.id || 'ENQ-901';
      const idx = data.findIndex(item => item.id === ticketId);
      if (idx !== -1) {
        data[idx] = {
          ...data[idx],
          status: body.status || 'RESOLVED',
          resolvedAt: body.status === 'RESOLVED' || !body.status ? 'Just now by Admin' : undefined,
        };
      }
      writeStore(data);
      return NextResponse.json({ success: true, data }, { status: 200, headers: CORS_HEADERS });
    }

    // Admin Reply Action
    if (body.action === 'reply' || body.sender === 'admin') {
      const ticketId = body.id || 'ENQ-901';
      const idx = data.findIndex(item => item.id === ticketId);
      const userText = (body.message || body.replyMessage || '').trim();

      if (idx !== -1) {
        const rec = data[idx];
        const newMsg: ChatMessage = {
          id: `msg-admin-${Date.now()}`,
          enquiryId: rec.id,
          sender: 'admin',
          senderName: body.senderName || 'Admin Support',
          message: userText,
          timestamp: nowTime,
        };

        const existingMsgs = rec.messages || [];
        const hasAlready = existingMsgs.some(m => m.message === userText && m.sender === 'admin');
        const nextMsgs = Array.isArray(body.messages) && body.messages.length > 0 
          ? body.messages 
          : (hasAlready ? existingMsgs : [...existingMsgs, newMsg]);

        data[idx] = {
          ...rec,
          replyMessage: userText || rec.replyMessage,
          status: 'IN_PROGRESS',
          messages: nextMsgs,
        };
      }
      writeStore(data);
      return NextResponse.json({ success: true, data }, { status: 200, headers: CORS_HEADERS });
    }

    // Customer Messages / Live Agent Connections / New Ticket Creation
    const custEmail = (body.senderEmail || '').trim().toLowerCase();
    const custPhone = (body.senderPhone || '').trim();
    const custName = body.senderName || 'Customer User';
    const userText = (body.message || 'I want to connect to a live support agent.').trim();

    // 1. Look for an existing UNRESOLVED ticket for this customer
    let existingIndex = data.findIndex((item) => {
      if (item.status === 'RESOLVED') return false;
      const matchEmail = custEmail && item.senderEmail && item.senderEmail.toLowerCase() === custEmail;
      const matchPhone = custPhone && item.senderPhone && item.senderPhone === custPhone;
      const matchId = body.id && item.id === body.id;
      return matchId || matchEmail || matchPhone;
    });

    // 2. If no active unresolved ticket found, check if body.id exists and is unresolved
    if (existingIndex === -1 && body.id) {
      existingIndex = data.findIndex(item => item.id === body.id && item.status !== 'RESOLVED');
    }

    const existing = existingIndex !== -1 ? data[existingIndex] : null;

    // KEY RESOLUTION LOGIC:
    // Create new ticket ONLY if no active unresolved ticket exists for this customer (or explicit create)!
    const shouldCreateNew = !existing || body.action === 'create';

    if (shouldCreateNew) {
      const newNum = Math.floor(906 + Math.random() * 9000);
      const newTicketId = body.id && body.id.startsWith('ENQ-') && body.id !== 'ENQ-901' ? body.id : `ENQ-${newNum}`;

      const newCustMsg: ChatMessage = {
        id: `msg-cust-${Date.now()}`,
        enquiryId: newTicketId,
        sender: 'customer',
        senderName: custName,
        message: userText,
        timestamp: nowTime,
      };

      const newRecord: EnquiryRecord = {
        id: newTicketId,
        category: body.category || 'CUSTOMER',
        senderName: custName,
        senderEmail: custEmail || 'customer@foodie.com',
        senderPhone: custPhone || '+91 98765 12345',
        subject: body.subject || `Live Agent Request: ${userText.substring(0, 30)}...`,
        message: userText,
        timestamp: 'Just now',
        status: 'OPEN',
        priority: body.priority || 'HIGH',
        orderId: body.orderId,
        messages: [newCustMsg],
      };

      data.unshift(newRecord);
    } else if (existingIndex !== -1 && existing) {
      // Append message to currently active (OPEN / IN_PROGRESS) ticket for this customer
      const newCustMsg: ChatMessage = {
        id: `msg-cust-${Date.now()}`,
        enquiryId: existing.id,
        sender: 'customer',
        senderName: custName,
        message: userText,
        timestamp: nowTime,
      };

      const prevMsgs = (existing.messages || []).filter(
        (m) => !m.message.includes('Message delivered to Admin Support') && !m.message.includes('Message sent to Admin Support')
      );

      data[existingIndex] = {
        ...existing,
        senderName: custName,
        senderEmail: custEmail || existing.senderEmail,
        senderPhone: custPhone || existing.senderPhone,
        subject: body.subject || existing.subject || `Live Agent Request: ${userText.substring(0, 30)}...`,
        message: userText,
        timestamp: 'Just now',
        status: 'OPEN',
        priority: 'HIGH',
        resolvedAt: undefined,
        messages: [...prevMsgs, newCustMsg],
      };
    }

    writeStore(data);
    return NextResponse.json(
      {
        success: true,
        data,
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to process support ticket' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
