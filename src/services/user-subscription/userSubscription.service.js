import userSubscriptionRepository from "../../repository/userSubscription.repository.js";

import subscriptionPlansService from "../subscription-plans/subscriptionPlans.service.js";

import { ApiError } from "../../utils/apiError.js";

import {
  axiosInstanceApiMain,
  axiosInstanceNotificationMicroservice,
  axiosInstancePaymentMicroservice,
} from "../../utils/axios.js";

import { AGENT_FREE_PLAN } from "../../utils/statesApp.js";

import generateToken from "../../utils/generateToken.js";

import { sumarDias } from "../../utils/sumarDias.js";

import { statesApp } from "../../utils/statesApp.js";

class UserSubscriptionService {
  async getUserSubscriptionData(sub) {
    try {
      const userSubscriptionData =
        await userSubscriptionRepository.getUserSubscriptionData(sub);

      if (!userSubscriptionData)
        throw new ApiError("Error al obtener datos de usuario", 404);

      // Valido si tiene suscripcion y plan de suscripcion
      if (
        Number(!Object.keys(userSubscriptionData.user_subscription).length) >
          0 ||
        Number(!Object.keys(userSubscriptionData.subscription_plan).length) > 0
      ) {
        return { status: false, data: userSubscriptionData };
      }

      return { status: true, data: userSubscriptionData };
    } catch (error) {
      throw new ApiErro("Error al obtener informacion de la suscripcion", 500);
    }
  }

  async createFreeTrial(sub, plan_id) {
    try {
      const { data } = await axiosInstanceApiMain.post(
        "/agent-data/installationFreeTierAgent",
        {
          nameAgent: AGENT_FREE_PLAN,
          sub,
        }
      );

      if (!data) throw new ApiError("Error al crear agente gratuito", 404);

      // fecha de caducidad general = fecha actual + 14 dias;
      const fechaCaducidad = sumarDias(new Date(), 14);

      // Defincion de variables para la suscripcion de prueba
      const status = "active";
      const billing_cycle = "monthly";
      const trial_start = new Date();
      const trial_end = fechaCaducidad;
      const current_period_start = new Date();
      const current_period_end = fechaCaducidad;
      const canceled_at = fechaCaducidad;
      const ended_at = fechaCaducidad;
      const current_agents_count = 1; // Porque el agente gratuito es 1
      const current_tokens_count = 0;
      const current_users_count = 1;
      const amount_paid = 0;
      const currency = "ARS";

      const user_susbscription =
        await userSubscriptionRepository.createUserSubscription(
          sub,
          plan_id,
          status,
          billing_cycle,
          trial_start,
          trial_end,
          current_period_start,
          current_period_end,
          canceled_at,
          ended_at,
          current_agents_count,
          current_tokens_count,
          current_users_count,
          amount_paid,
          currency
        );

      if (!user_susbscription)
        throw new ApiError(
          "Error al crear suscripción de prueba gratuita",
          404
        );

      // Genero un token para que la api de notifications no genere error
      const token = generateToken({ sub });

      axiosInstanceNotificationMicroservice.post(
        "/api/emails/new-free-trial",
        {
          sub,
          endData: current_period_end,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return {
        status: true,
        user_susbscription,
        agent: data,
      };
    } catch (error) {
      console.log("error in create sub", error);
      throw new ApiError("Error al crear suscripcion gratuita", 500);
    }
  }

  /**
   * 
   * @param {*} sub 
   * @param {*} data: {
      payer: {
        email: string;
        first_name: string;
        last_name: string;
        phone: string;
        identification: {
          type: string;
          number: string;
        };
        company?: string;
        notes?: string;
      };
      plan_id: number;
      billing_cycle: string;
      amount: number;
      currency: string;
      receipt_payments?: string;
      type?: string;
    }} 
   */
  async register(sub, data) {
    try {
      const existUserSubscription =
        await userSubscriptionRepository.validateExisteUserSuscription(sub);

      const subscriptionData =
        await subscriptionPlansService.getSubscriptionPlanById(data.plan_id);

      console.log("subscriptionData", subscriptionData);

      let numberDaysPerPeriod;
      let amount_paid;
      if (data.billing_cycle === "monthly") {
        numberDaysPerPeriod = 30;
        amount_paid = subscriptionData.data.price_monthly;
      } else {
        numberDaysPerPeriod = 365;
        amount_paid = subscriptionData.data.price_yearly;
      }

      let fecha_caducidad = sumarDias(new Date(), numberDaysPerPeriod);

      //* Seteo la suscripcion en pendiente haza que finalize el pago
      const status = statesApp.user_suscription.pending;

      const billing_cycle = data.billing_cycle;

      const trial_start = null;
      const trial_end = null;

      let current_period_start = new Date();
      let current_period_end = fecha_caducidad;

      const canceled_at = null;
      let ended_at = fecha_caducidad;

      let current_agents_count = 0;
      let current_tokens_count = 0;
      let current_users_count = 1;

      const currency = data.currency;

      let user_susbscription;

      // Si no existe suscripcion, crear una nueva
      if (!existUserSubscription) {
        // existUserSuscription = false
        const suscripcion = await this.createNewSubscription(
          sub,
          data.plan_id,
          status,
          billing_cycle,
          trial_start,
          trial_end,
          current_period_start,
          current_period_end,
          canceled_at,
          ended_at,
          current_agents_count,
          current_tokens_count,
          current_users_count,
          amount_paid,
          currency
        );

        // console.log("suscription created", suscripcion);

        if (!suscripcion.status) {
          throw new ApiError("Error al crear suscripcion", 404);
        }

        user_susbscription = suscripcion.userSubscription;
      } else {
        // Si existe suscripcion, actualizar

        // Revalidacion logicas para renovacion de suscripcion ( para no perder agentes, tokens, y fechas de expiracion )
        fecha_caducidad = sumarDias(
          existUserSubscription.user_subscription.current_period_end,
          numberDaysPerPeriod
        );
        current_period_start =
          existUserSubscription.user_subscription.current_period_end;

        current_period_end = fecha_caducidad;
        ended_at = fecha_caducidad;

        current_agents_count =
          existUserSubscription.user_subscription.current_agents_count;
        current_tokens_count = 0; // Si renueva, se resetea el contador de tokens
        current_users_count =
          existUserSubscription.user_subscription.current_users_count;

        //* actualizo informacion asociada a la suscripcion del usuario
        const suscripcion = await this.updateSubscription(
          sub,
          data.plan_id,
          status,
          billing_cycle,
          trial_start,
          trial_end,
          current_period_start,
          current_period_end,
          canceled_at,
          ended_at,
          current_agents_count,
          current_tokens_count,
          current_users_count,
          amount_paid,
          currency
        );

        if (!suscripcion.status) {
          throw new ApiError("Error al actualizar suscripcion", 404);
        }

        user_susbscription = suscripcion.userSubscription;
      }

      // QUINTO BLOQUE: validacion de suscripcion (registrada), creacion de preferencia de pago y envio de notificaciones
      if (user_susbscription) {
        //* Objeto de items para creacion de prefencia de pago
        const items = [
          {
            id: subscriptionData.data.id, //id de plan de suscripcion seleccionado por user,
            title: subscriptionData.data.name,
            description: subscriptionData.data.description,
            category_id: "services",
            quantity: 1,
            currency_id: "ARS", //* por ahora fijo en ars
            unit_price: Number(amount_paid),
          },
        ];

        //* Objeto de payer para creacion de prefencia de pago
        const payer = {
          name: data.payer.first_name,
          surname: data.payer.last_name,
          email: data.payer.email,
          identification: {
            type: data.payer.identification.type || "DNI",
            number: data.payer.identification.number,
          },
          first_name: data.payer.first_name,
          last_name: data.payer.last_name,
          id: sub, //* identificador de google asociado al usuario.
        };

        //* Identificador externo con datos internos del sistema y del usuarios para la creacion de la preferencia de pago
        const external_reference = `${sub}|${user_susbscription.id}|${data.plan_id}`;

        //* Objeto con informacion extra utilizada en microservicio de pagos.
        const extra_info_plan = {
          billing_cycle: data.billing_cycle,
          current_period_end: user_susbscription.current_period_start,
          next_period_end: user_susbscription.current_period_end,
          amount_paid: user_susbscription.amount_paid,
          currency: "ARS", //* por ahora fijo en ars
        };

        const token = generateToken({ service: "process-payment" }, "5h");

        const { data: preferenceCreated } =
          await axiosInstancePaymentMicroservice.post(
            "/api/payments/create-prefence",
            {
              items,
              payer,
              external_reference,
              extra_info_plan,
              token,
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

        if (!preferenceCreated)
          throw new ApiError("Error al crear preferencia de pago", 404);

        return {
          status: true,
          user_susbscription: user_susbscription,
          preference_created: preferenceCreated,
        };
      } else {
        throw new ApiError("Error al crear preferencia de pago", 404);
      }
    } catch (error) {
      console.log("error in register", error);
      throw new ApiError("Error al registrar suscripcion", 500);
    }
  }

  async updateSubscription(
    sub,
    plan_id,
    status,
    billing_cycle,
    trial_start,
    trial_end,
    current_period_start,
    current_period_end,
    canceled_at,
    ended_at,
    current_agents_count,
    current_tokens_count,
    current_users_count,
    amount_paid,
    currency
  ) {
    try {
      const userSubscription =
        await userSubscriptionRepository.updateUserSubscription(
          sub,
          plan_id,
          status,
          billing_cycle,
          trial_start,
          trial_end,
          current_period_start,
          current_period_end,
          canceled_at,
          ended_at,
          current_agents_count,
          current_tokens_count,
          current_users_count,
          amount_paid,
          currency
        );

      if (!userSubscription) {
        throw new ApiError("Error al actualizar suscripcion", 404);
      }

      return {
        status: true,
        userSubscription,
      };
    } catch (error) {
      throw new ApiError("Error al actualizar suscripcion", 500);
    }
  }

  async cancel(sub) {
    try {
      const existUserSubscription =
        await userSubscriptionRepository.validateExisteUserSuscription(sub);

      if (!existUserSubscription) {
        throw new ApiError("Error al cancelar suscripcion", 404);
      }

      const userSubscription =
        await userSubscriptionRepository.cancelUserSubscription(sub);

      if (!userSubscription) {
        throw new ApiError("Error al cancelar suscripcion", 404);
      }

      return {
        status: true,
        userSubscription,
      };
    } catch (error) {
      throw new ApiError("Error al cancelar suscripcion", 500);
    }
  }
}

export default new UserSubscriptionService();
