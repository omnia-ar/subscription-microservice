import { query, transaction } from "../../config/database.js";

export const pendingSubscription = async ({
  user_sub,
  subscription_id,
  status_subscription,
}) => {
  try {
    const result = await query(
      `
      UPDATE user_subscription 
      SET 
        status = $1,
        canceled_at = NULL,
        expired_at = NULL,
        updated_at = NOW()
      WHERE user_sub = $2
      RETURNING *
    `,
      [status_subscription, user_sub]
    );

    if (result.rowCount === 0) {
      throw new Error(
        `No se encontró suscripción con user_sub: ${user_sub} y subscription_id: ${subscription_id}`
      );
    }

    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

export const activeSubscription = async ({
  user_sub,
  subscription_id,
  status_subscription,
}) => {
  try {
    const result = await query(
      `
      UPDATE user_subscription 
      SET 
        status = $1,
        canceled_at = NULL,
        ended_at = NULL,
        updated_at = NOW()
      WHERE user_sub = $2
      RETURNING *
    `,
      [status_subscription, user_sub]
    );

    if (result.rowCount === 0) {
      throw new Error(
        `No se encontró suscripción con user_sub: ${user_sub} y subscription_id: ${subscription_id}`
      );
    }

    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

export const canceledSubscription = async ({
  user_sub,
  subscription_id,
  plan_id,
  status_subscription,
}) => {
  try {
    const result = await query(
      `
      UPDATE user_subscription 
      SET 
        status = $1,
        current_period_start = NOW(),
        current_period_end = NOW(),
        canceled_at = NOW(),
        ended_at = NULL,
        updated_at = NOW()
      WHERE user_sub = $2
      RETURNING *
    `,
      [status_subscription, user_sub]
    );

    if (result.rowCount === 0) {
      throw new Error(
        `No se encontró suscripción con user_sub: ${user_sub} y subscription_id: ${subscription_id}`
      );
    }

    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

export const expiredSubscription = async ({
  user_sub,
  subscription_id,
  status_subscription,
}) => {
  try {
    const result = await query(
      `
      UPDATE user_subscription 
      SET 
        status = $1,
        current_period_start = NOW(),
        current_period_end = NOW(),
        canceled_at = NULL,
        ended_at = NOW(),
        updated_at = NOW()
      WHERE user_sub = $2
      RETURNING *
    `,
      [status_subscription, user_sub]
    );

    if (result.rowCount === 0) {
      throw new Error(
        `No se encontró suscripción con user_sub: ${user_sub} y subscription_id: ${subscription_id}`
      );
    }

    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

export const handlePaymentFailure = async ({
  user_sub,
  status_subscription, // Debería ser 'past_due' o 'canceled'
}) => {
  try {
    /* LÓGICA CONDICIONAL EN SQL:
       Solo actualizamos el estado si el periodo ya terminó (current_period_end < NOW()).
       Si el periodo sigue vigente (usuario pagó por adelantado y falló), NO TOCAMOS NADA.
    */
    const result = await query(
      `
        UPDATE user_subscription 
        SET 
          status = CASE 
            -- CASO 1: Si es NUEVA (pending) y falló -> Forzamos el nuevo estado (rejected/inactive)
            WHEN status = 'pending' THEN $1
            
            -- CASO 2: Si es RENOVACIÓN (active) y aún tiene tiempo -> Protegemos el estado (active)
            WHEN current_period_end > NOW() THEN status 
            
            -- CASO 3: Si ya venció -> Aplicamos el estado de fallo (past_due/inactive)
            ELSE $1                                     
          END,
  
          -- CORRECCIÓN IMPORTANTE DE FECHAS
          current_period_end = CASE
             -- Si era pending y falló, MATAMOS la fecha futura que le diste por error
             WHEN status = 'pending' THEN NOW() 
             ELSE current_period_end
          END,
  
          ended_at = CASE
             -- Si era pending, técnicamente terminó hoy mismo
             WHEN status = 'pending' THEN NOW()
             ELSE ended_at
          END,
  
          canceled_at = NOW(),
          updated_at = NOW()
        WHERE user_sub = $2
        RETURNING *, 
        (current_period_end > NOW() AND status != 'rejected') as still_has_access
      `,
      [status_subscription, user_sub]
    );

    if (result.rowCount === 0) {
      // Manejo silencioso o error según prefieras
      console.warn(`Subscripción no encontrada para user_sub: ${user_sub}`);
      return null;
    }

    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

export const revokeSubscription = async ({
  user_sub,
  status_subscription, // 'canceled'
}) => {
  try {
    // Aquí SI forzamos el fin del periodo porque devolvimos el dinero
    const result = await query(
      `
      UPDATE user_subscription 
      SET 
        status = $1,
        current_period_end = NOW(), -- Cortamos el acceso inmediatamente
        ended_at = NOW(),
        canceled_at = NOW(),
        updated_at = NOW()
      WHERE user_sub = $2
      RETURNING *
    `,
      [status_subscription, user_sub]
    );

    return result.rows[0];
  } catch (error) {
    throw error;
  }
};
