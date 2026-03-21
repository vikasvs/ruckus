import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { statusEventId } = await req.json()

    // Get the status event details
    const { data: statusEvent, error: statusError } = await supabaseClient
      .from('status_events')
      .select(`
        *,
        users!inner(first_name),
        groups!inner(name)
      `)
      .eq('id', statusEventId)
      .single()

    if (statusError) {
      throw statusError
    }

    // Get all group members except the one who triggered the status
    const { data: members, error: membersError } = await supabaseClient
      .from('group_members')
      .select(`
        users!inner(push_token, device_platform)
      `)
      .eq('group_id', statusEvent.group_id)
      .eq('notifications_enabled', true)
      .neq('user_id', statusEvent.user_id)

    if (membersError) {
      throw membersError
    }

    // Filter out members without push tokens
    const membersWithTokens = members.filter(member => 
      member.users?.push_token && member.users.push_token.length > 0
    )

    if (membersWithTokens.length === 0) {
      console.log('No members with push tokens found')
      return new Response(
        JSON.stringify({ success: true, recipients: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare notification payload
    const notificationTitle = statusEvent.groups.name
    const notificationBody = `${statusEvent.users.first_name} is ${statusEvent.status_type} up @ ${
      new Date(statusEvent.created_at).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }`

    // Send push notifications using Expo's push notification service
    const messages = membersWithTokens.map(member => ({
      to: member.users.push_token,
      title: notificationTitle,
      body: notificationBody,
      data: {
        groupId: statusEvent.group_id,
        statusType: statusEvent.status_type,
        userId: statusEvent.user_id,
      },
      sound: 'default',
      badge: 1,
    }))

    // Send to Expo Push API
    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    })

    const expoResult = await expoResponse.json()

    // Log the notification
    await supabaseClient
      .from('notification_logs')
      .insert({
        group_id: statusEvent.group_id,
        triggered_by: statusEvent.user_id,
        status_type: statusEvent.status_type,
        recipient_count: membersWithTokens.length,
      })

    console.log(`Sent ${membersWithTokens.length} notifications for ${statusEvent.status_type} status`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        recipients: membersWithTokens.length,
        expoResult 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error sending notifications:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})