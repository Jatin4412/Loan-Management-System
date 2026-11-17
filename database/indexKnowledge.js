const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

function splitTextIntoChunks(text, maxLength = 1000, overlap = 120) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const chunks = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + maxLength, normalized.length);

    if (end < normalized.length) {
      const space = normalized.lastIndexOf(' ', end);
      if (space > start + Math.floor(maxLength * 0.65)) {
        end = space;
      }
    }

    const chunk = normalized.slice(start, end).trim();
    if (chunk) chunks.push(chunk);

    if (end >= normalized.length) break;
    start = Math.max(start + 1, end - overlap);
  }

  return chunks;
}

function readMarkdownSections(filePath) {
  const markdown = fs.readFileSync(filePath, 'utf8').replace(/\r/g, '');
  const lines = markdown.split('\n');
  const fileName = path.basename(filePath);
  const firstHeading = lines.find(line => /^#\s+/.test(line));
  const documentTitle = firstHeading
    ? firstHeading.replace(/^#\s+/, '').trim()
    : path.basename(filePath, '.md');

  const sections = [];
  let currentSection = 'Overview';
  let buffer = [];

  const flush = () => {
    const body = buffer.join('\n').trim();
    if (body) sections.push({ section: currentSection, body });
    buffer = [];
  };

  for (const line of lines) {
    const heading = line.match(/^#{1,3}\s+(.+)$/);

    if (heading) {
      flush();
      currentSection = heading[1].trim();
    } else {
      buffer.push(line);
    }
  }

  flush();

  const chunks = [];
  for (const section of sections) {
    for (const content of splitTextIntoChunks(section.body)) {
      chunks.push({
        documentTitle,
        section: section.section.slice(0, 255),
        content
      });
    }
  }

  return {
    documentTitle,
    sourceFile: fileName,
    chunks
  };
}

async function main() {
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
    throw new Error('Set DB_HOST, DB_USER and DB_NAME in the repository root .env file.');
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    connectTimeout: 15000
  });

  try {
    const knowledgeDirectory = path.resolve(__dirname, '../backend/knowledge');

    if (!fs.existsSync(knowledgeDirectory)) {
      throw new Error('Knowledge folder not found: ' + knowledgeDirectory);
    }

    const files = fs.readdirSync(knowledgeDirectory)
      .filter(file => file.toLowerCase().endsWith('.md'))
      .sort();

    if (!files.length) {
      throw new Error('No Markdown knowledge documents were found.');
    }

    const documents = files.map(file =>
      readMarkdownSections(path.join(knowledgeDirectory, file))
    );

    const rows = documents.flatMap(document =>
      document.chunks.map(chunk => ({
        ...chunk,
        sourceFile: document.sourceFile
      }))
    );

    if (!rows.length) {
      throw new Error('The Markdown documents did not contain any indexable text.');
    }

    await connection.beginTransaction();

    try {
      await connection.execute('DELETE FROM knowledge_chunks');

      for (const row of rows) {
        const chunkHash = crypto
          .createHash('sha256')
          .update([row.sourceFile, row.section, row.content].join('\n'))
          .digest('hex');

        await connection.execute(
          'INSERT INTO knowledge_chunks (document_title, source_file, section, content, chunk_hash) VALUES (?, ?, ?, ?, ?)',
          [row.documentTitle, row.sourceFile, row.section, row.content, chunkHash]
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    }

    console.log('Knowledge index refreshed successfully.');
    console.log('Documents indexed: ' + documents.length);
    console.log('Chunks indexed: ' + rows.length);
    console.log('Search index: MySQL FULLTEXT');
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  console.error('\nKnowledge indexing failed:');
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});