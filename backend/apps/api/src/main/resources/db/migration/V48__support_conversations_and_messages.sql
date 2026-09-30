CREATE TABLE support_conversation (
    id VARCHAR(50) PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    assigned_agent_id VARCHAR(50),
    status VARCHAR(30) NOT NULL,
    category VARCHAR(50),
    subject VARCHAR(200),
    order_id VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE support_message (
    id VARCHAR(50) PRIMARY KEY,
    conversation_id VARCHAR(50) NOT NULL REFERENCES support_conversation(id),
    sender_type VARCHAR(30) NOT NULL,
    sender_id VARCHAR(50),
    sender_name VARCHAR(100),
    message_type VARCHAR(30) NOT NULL DEFAULT 'TEXT',
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_support_conversation_customer_id ON support_conversation(customer_id);
CREATE INDEX idx_support_conversation_status ON support_conversation(status);
CREATE INDEX idx_support_message_conversation_id ON support_message(conversation_id);
