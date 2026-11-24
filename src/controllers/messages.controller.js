import messagesService from "../services/messages.service.js";
import { toErrorResponse } from "../utils/errors.js";

/**
 * Controller de messages: lee la request (req.params, req.query, req.body),
 * llama al service y responde con res.status().json().
 */

/** Responde un error con el código HTTP que corresponde. */
const sendError = (res, error) => {
  const { statusCode, body } = toErrorResponse(error);
  return res.status(statusCode).json(body);
};

/** GET /api/messages -> lista todos los mensajes (filtros opcionales ?user= y ?booking=) */
export const getMessages = async (req, res) => {
  try {
    const { user, booking } = req.query;
    const messages = await messagesService.getMessages({ user, booking });
    return res.status(200).json({ status: "success", count: messages.length, payload: messages });
  } catch (error) {
    return sendError(res, error);
  }
};

/** GET /api/messages/:mid -> obtiene un mensaje por id */
export const getMessageById = async (req, res) => {
  try {
    const message = await messagesService.getMessageById(req.params.mid);
    return res.status(200).json({ status: "success", payload: message });
  } catch (error) {
    return sendError(res, error);
  }
};

/** POST /api/messages -> crea un mensaje */
export const createMessage = async (req, res) => {
  try {
    const newMessage = await messagesService.createMessage(req.body);
    return res.status(201).json({ status: "success", message: "Mensaje creado", payload: newMessage });
  } catch (error) {
    return sendError(res, error);
  }
};

/** DELETE /api/messages/:mid -> elimina un mensaje */
export const deleteMessage = async (req, res) => {
  try {
    const deleted = await messagesService.deleteMessage(req.params.mid);
    return res.status(200).json({ status: "success", message: "Mensaje eliminado", payload: deleted });
  } catch (error) {
    return sendError(res, error);
  }
};
