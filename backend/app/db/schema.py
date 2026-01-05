"""
Database Schema Initialization

SQL schema for documents and namespaces tables.
"""

CREATE_NAMESPACES_TABLE = """
CREATE TABLE IF NOT EXISTS namespaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    document_count INTEGER DEFAULT 0,
    total_chunks INTEGER DEFAULT 0,
    
    -- Pinecone Configuration
    default_dense_namespace VARCHAR(255),
    default_sparse_namespace VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_namespaces_name ON namespaces(name);
"""

CREATE_DOCUMENTS_TABLE = """
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    page_count INTEGER,
    mime_type VARCHAR(100) DEFAULT 'application/pdf',
    
    -- Pinecone References
    pinecone_dense_namespace VARCHAR(255) NOT NULL,
    pinecone_sparse_namespace VARCHAR(255) NOT NULL,
    dense_index_name VARCHAR(255) DEFAULT 'rag-comparator-dense',
    sparse_index_name VARCHAR(255) DEFAULT 'rag-comparator-sparse',
    
    -- Processing Metadata
    processing_strategy VARCHAR(50),
    chunk_count INTEGER NOT NULL DEFAULT 0,
    total_chunks_with_tables INTEGER DEFAULT 0,
    total_chunks_with_images INTEGER DEFAULT 0,
    ai_enhancement_enabled BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_documents_namespace ON documents(pinecone_dense_namespace);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON documents(deleted_at) WHERE deleted_at IS NULL;
"""

CREATE_DOCUMENT_NAMESPACES_TABLE = """
CREATE TABLE IF NOT EXISTS document_namespaces (
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    namespace_id UUID REFERENCES namespaces(id) ON DELETE CASCADE,
    PRIMARY KEY (document_id, namespace_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
"""

CREATE_CHUNKS_TABLE = """
CREATE TABLE IF NOT EXISTS chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    
    -- Pinecone Vector IDs
    dense_vector_id VARCHAR(255) UNIQUE NOT NULL,
    sparse_vector_id VARCHAR(255),
    
    -- Content Preview (first 200 chars)
    text_preview TEXT,
    
    -- Content Type Flags
    has_table BOOLEAN DEFAULT FALSE,
    has_image BOOLEAN DEFAULT FALSE,
    content_type VARCHAR(50),
    
    -- Position in Document
    chunk_index INTEGER NOT NULL,
    page_numbers INTEGER[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chunks_document ON chunks(document_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_chunks_dense_vector ON chunks(dense_vector_id);
"""

# Function to update namespace counts
CREATE_NAMESPACE_COUNT_TRIGGER = """
CREATE OR REPLACE FUNCTION update_namespace_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE namespaces 
        SET document_count = document_count + 1
        WHERE id = NEW.namespace_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE namespaces 
        SET document_count = document_count - 1
        WHERE id = OLD.namespace_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS namespace_count_trigger ON document_namespaces;
CREATE TRIGGER namespace_count_trigger
AFTER INSERT OR DELETE ON document_namespaces
FOR EACH ROW EXECUTE FUNCTION update_namespace_counts();
"""

# All initialization statements
INIT_SCHEMA = [
    CREATE_NAMESPACES_TABLE,
    CREATE_DOCUMENTS_TABLE,
    CREATE_DOCUMENT_NAMESPACES_TABLE,
    CREATE_CHUNKS_TABLE,
    CREATE_NAMESPACE_COUNT_TRIGGER,
]
