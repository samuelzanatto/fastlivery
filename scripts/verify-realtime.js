
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ayawqvfaobjviiyolthv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5YXdxdmZhb2JqdmlpeW9sdGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyODc5MjIsImV4cCI6MjA3Mzg2MzkyMn0.qKfBi5rcr7H84ZPYFDXdxVzL7P_G8tJPbhxNHUF9BJI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const conversationId = 'daecd0e7-5ca3-424b-b3af-5907d5cfa2ce';

console.log('Initializing Realtime verification...');

// 1. Check API Access (RLS Check)
async function checkApiAccess() {
    console.log('1. Testing direct API access for this conversation...');
    const { data, error } = await supabase
        .from('chat_messages')
        .select('id, content')
        .eq('conversationId', conversationId)
        .limit(1);

    if (error) {
        console.error('❌ API Select Error:', error.message);
        if (error.code === '42501') console.error('   -> RLS Permission Denied!');
    } else {
        console.log('✅ API Select Success. Found rows:', data?.length);
    }
}

checkApiAccess();

// 2. Realtime Listener (No Filter)
console.log('2. setting up Realtime listener...');
const channel = supabase
    .channel(`debug_node_${Date.now()}`)
    .on(
        'postgres_changes',
        {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages'
        },
        (payload) => {
            console.log('✅✅✅ Change received!', payload.new);
        }
    )
    .subscribe((status) => {
        console.log(`[Subscription Status]: ${status}`);
        if (status === 'SUBSCRIBED') {
            console.log('   -> Listening for ANY insert on chat_messages...');
        }
    });

setInterval(() => { }, 1000);
