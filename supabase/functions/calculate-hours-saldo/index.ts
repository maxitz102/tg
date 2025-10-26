import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CalculateSaldoRequest {
  user_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { user_id }: CalculateSaldoRequest = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get all schedules (Soll-Zeiten) for the user
    const { data: schedules, error: schedulesError } = await supabaseClient
      .from('schedules')
      .select('start_time, end_time')
      .eq('user_id', user_id)

    if (schedulesError) {
      throw new Error(`Error fetching schedules: ${schedulesError.message}`)
    }

    // Get all timerecords (Ist-Zeiten) for the user
    const { data: timerecords, error: timerecordsError } = await supabaseClient
      .from('timerecords')
      .select('check_in, check_out, total_hours')
      .eq('user_id', user_id)
      .not('check_out', 'is', null) // Only completed time records

    if (timerecordsError) {
      throw new Error(`Error fetching timerecords: ${timerecordsError.message}`)
    }

    // Calculate total scheduled hours (Soll-Zeiten)
    let totalScheduledHours = 0
    if (schedules) {
      for (const schedule of schedules) {
        const startTime = new Date(schedule.start_time)
        const endTime = new Date(schedule.end_time)
        const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
        totalScheduledHours += hours
      }
    }

    // Calculate total worked hours (Ist-Zeiten)
    let totalWorkedHours = 0
    if (timerecords) {
      for (const record of timerecords) {
        if (record.total_hours) {
          totalWorkedHours += record.total_hours
        } else if (record.check_in && record.check_out) {
          // Calculate hours if total_hours is not set
          const checkIn = new Date(record.check_in)
          const checkOut = new Date(record.check_out)
          const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)
          totalWorkedHours += hours
        }
      }
    }

    // Calculate saldo (Ist-Zeiten - Soll-Zeiten)
    const saldo = totalWorkedHours - totalScheduledHours

    // Update the user's hours_saldo in profiles table
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ hours_saldo: Math.round(saldo * 100) / 100 }) // Round to 2 decimal places
      .eq('id', user_id)

    if (updateError) {
      throw new Error(`Error updating hours_saldo: ${updateError.message}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        saldo: Math.round(saldo * 100) / 100,
        totalScheduledHours: Math.round(totalScheduledHours * 100) / 100,
        totalWorkedHours: Math.round(totalWorkedHours * 100) / 100
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error calculating hours saldo:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
