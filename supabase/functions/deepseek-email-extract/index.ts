import { createClient } from 'npm:@supabase/supabase-js@2';
const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
Deno.serve(async (req)=>{
  const { table, schema, record } = await req.json();
  const table_name = schema + "." + table;
  const row_id = Number(record.id);
  const oricontent = record.oricontent?.slice(0, 5000) || '';
  // DeepSeek API call
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'Extract the content of the latest email from the user\'s email content, excluding the signature and the previously quoted emails, and also excluding the headers of the email (e.g., From:xxx, To:xxx, Cc:xxx, Subject:xxx, Date:xxx...)The content of the lastest email should be at the very begining of the Email Content and presented as a continuous block.Extract only the body of the email, remove the signature and quoted content, do not modify any words in the original text, do not change the meaning of the original text, and do not translate it.'
        },
        {
          role: 'user',
          content: oricontent
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })
  });
  const data = await response.json();
  const extractedContent = data.choices[0].message.content;
  console.log(`${schema}.${table}` + "[" + row_id + "]: " + extractedContent);
  // Initialize Supabase client
  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  // Update the specific row in the corresponding table
  const result = await supabase.schema(`${schema}`).from(`${table}`).update({
    'content': extractedContent
  }).eq('id', row_id);
  console.log(result);
  return new Response(JSON.stringify({
    result
  }));
});
