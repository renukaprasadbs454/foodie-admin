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
    senderName: 'Ananya Sharma',
    senderEmail: 'ananya.s@gmail.com',
    senderPhone: '+91 98765 12345',
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
        senderName: 'Ananya Sharma',
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

const STORE_FILE = path.join(os.tmpdir(), 'foodie_support_enquiries_v3.json');

function sanitizeStore(data: EnquiryRecord[]): EnquiryRecord[] {
  const allowedInitial = new Set(['ENQ-901', 'ENQ-902', 'ENQ-903', 'ENQ-904', 'ENQ-905']);
  return data.filter((item) => {
    if (allowedInitial.has(item.id)) return true;
    const num = parseInt((item.id || '').replace('ENQ-', ''), 10);
    // Remove all test spam IDs (906, 933, 946, 955, 963, 966, 989, etc.)
    if (!isNaN(num) && num >= 906) return false;
    return true;
  });
}

function readStore(): EnquiryRecord[] {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const content = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned = sanitizeStore(parsed);
        if (cleaned.length !== parsed.length) {
          writeStore(cleaned);
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

    // Always default to ENQ-901 to avoid creating new duplicate ticket cards
    const ticketId = body.id && body.id.startsWith('ENQ-90') ? body.id : 'ENQ-901';
    let existingIndex = data.findIndex((item) => item.id === ticketId);
    if (existingIndex === -1) {
      existingIndex = 0; // Target ENQ-901
    }

    const rec = data[existingIndex] || INITIAL_ENQUIRIES[0];
    const userText = (body.message || body.replyMessage || '').trim();

    if (body.action === 'reply') {
      const sender = body.sender || 'admin';
      const senderName = body.senderName || (sender === 'admin' ? 'Admin Support' : rec.senderName);
      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        enquiryId: rec.id,
        sender: sender,
        senderName: senderName,
        message: userText,
        timestamp: nowTime,
      };

      const existingMsgs = rec.messages || [];
      data[existingIndex] = {
        ...rec,
        replyMessage: sender === 'admin' ? userText : rec.replyMessage,
        status: sender === 'admin' ? 'IN_PROGRESS' : rec.status,
        messages: [...existingMsgs, newMsg],
      };
    } else if (body.action === 'status' || body.action === 'resolve') {
      data[existingIndex] = {
        ...rec,
        status: body.status || 'RESOLVED',
        resolvedAt: body.status === 'RESOLVED' || !body.status ? 'Just now by Admin' : undefined,
      };
    } else {
      // Append customer message directly into ENQ-901
      const newCustMsg: ChatMessage = {
        id: `msg-cust-${Date.now()}`,
        enquiryId: rec.id,
        sender: 'customer',
        senderName: rec.senderName || 'Ananya Sharma',
        message: userText,
        timestamp: nowTime,
      };

      const newSysAckMsg: ChatMessage = {
        id: `msg-sys-${Date.now() + 1}`,
        enquiryId: rec.id,
        sender: 'admin',
        senderName: 'Foodie Live Agent Desk',
        message: `🎧 Message delivered to Admin Support → Customer Enquiries (Ticket #${rec.id}).`,
        timestamp: nowTime,
      };

      const existingMsgs = rec.messages || [];
      data[existingIndex] = {
        ...rec,
        message: userText || rec.message,
        timestamp: 'Just now',
        status: rec.status === 'RESOLVED' ? 'IN_PROGRESS' : rec.status,
        messages: [...existingMsgs, newCustMsg, newSysAckMsg],
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
