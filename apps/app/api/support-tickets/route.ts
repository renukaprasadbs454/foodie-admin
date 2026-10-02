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

const INITIAL_ENQUIRIES: EnquiryRecord[] = [];

const STORE_FILE = path.join(os.tmpdir(), 'foodie_support_enquiries_v3.json');

function sanitizeStore(data: EnquiryRecord[]): EnquiryRecord[] {
  // Let dynamic tickets persist
  return data;
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
  } catch { }

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
    const data = readStore();
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

    const ticketId = body.id || `ENQ-${Math.floor(100 + Math.random() * 900)}`;
    let existingIndex = data.findIndex((item) => item.id === ticketId);

    // If ticket doesn't exist yet, push a new blank/initial record
    if (existingIndex === -1) {
      const newRec: EnquiryRecord = {
        id: ticketId,
        category: body.category || 'CUSTOMER',
        senderName: body.senderName || 'Customer',
        senderEmail: body.senderEmail || 'customer@example.com',
        senderPhone: body.senderPhone || '',
        subject: body.subject || 'Support Request',
        message: body.message || '',
        timestamp: 'Just now',
        status: 'OPEN',
        priority: 'MEDIUM',
        orderId: body.orderId,
      };
      // For connect_agent, body might have `messages` payload from the customer
      if (body.action === 'connect_agent' && Array.isArray(body.messages)) {
        newRec.messages = body.messages;
      }
      data.unshift(newRec);
      existingIndex = 0; // point to the unshifted record
    } else if (body.action === 'connect_agent' && Array.isArray(body.messages)) {
      data[existingIndex].messages = body.messages;
    }

    const rec = data[existingIndex] || INITIAL_ENQUIRIES[0];
    const userText = (body.message || body.replyMessage || '').trim();

    if (body.action === 'reply' || body.sender === 'admin') {
      const sender = body.sender || 'admin';
      const senderName = body.senderName || (sender === 'admin' ? 'Admin Support' : (rec.senderName || 'Customer'));
      const newMsg: ChatMessage = {
        id: body.messageId || `msg-${sender}-${Date.now()}`,
        enquiryId: rec.id,
        sender: sender as 'customer' | 'admin',
        senderName: senderName,
        message: userText,
        timestamp: nowTime,
      };

      const existingMsgs = rec.messages || [];
      const hasAlready = existingMsgs.some(m => m.message === userText && m.sender === sender);

      data[existingIndex] = {
        ...rec,
        senderName: body.senderName && body.senderName !== 'Customer' ? body.senderName : rec.senderName,
        senderEmail: body.senderEmail || rec.senderEmail,
        senderPhone: body.senderPhone || rec.senderPhone,
        orderId: body.orderId || rec.orderId,
        replyMessage: userText || rec.replyMessage,
        status: 'IN_PROGRESS',
        messages: hasAlready ? existingMsgs : [...existingMsgs, newMsg],
      };
    } else if (body.action === 'status' || body.action === 'resolve') {
      data[existingIndex] = {
        ...rec,
        status: body.status || 'RESOLVED',
        resolvedAt: body.status === 'RESOLVED' || !body.status ? 'Just now by Admin' : undefined,
      };
    } else if (body.action !== 'connect_agent') {
      // Append customer message normally for other actions
      if (userText) {
        const newCustMsg: ChatMessage = {
          id: `msg-cust-${Date.now()}`,
          enquiryId: rec.id,
          sender: 'customer',
          senderName: rec.senderName || 'Customer',
          message: userText,
          timestamp: nowTime,
        };

        const existingMsgs = (rec.messages || []).filter(
          (m) => !m.message.includes('Message delivered to Admin Support') && !m.message.includes('Message sent to Admin Support')
        );

        data[existingIndex] = {
          ...rec,
          senderName: body.senderName && body.senderName !== 'Customer' ? body.senderName : rec.senderName,
          senderEmail: body.senderEmail || rec.senderEmail,
          senderPhone: body.senderPhone || rec.senderPhone,
          orderId: body.orderId || rec.orderId,
          message: userText,
          timestamp: 'Just now',
          status: rec.status === 'RESOLVED' ? 'IN_PROGRESS' : rec.status,
          messages: [...existingMsgs, newCustMsg],
        };
      }
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
  } catch (e: unknown) {
    const err = e as Error;
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to process support ticket' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
