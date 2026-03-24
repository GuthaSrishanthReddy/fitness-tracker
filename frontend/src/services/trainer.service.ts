import { api } from "./api";
import type {
  TrainerDetail,
  TrainerListItem,
  TrainerProfile,
  TrainerRequestItem
} from "../types/trainer.types";
import type { ClientListItem, ClientProgressDetails, ExploreClientItem } from "../types/client.types";

export const fetchExploreClients = () =>
  api<ExploreClientItem[]>("/trainers/explore-clients");

export const removeClient = (clientLinkId: string) =>
  api(`/trainers/clients/${clientLinkId}`, { method: "DELETE" });

export const fetchMyClients = () =>
  api<ClientListItem[]>("/trainers/clients");

export const fetchTrainerClientDetails = (clientLinkId: string) =>
  api<ClientProgressDetails>(`/trainers/clients/${clientLinkId}`);


export const fetchTrainerProfile = () =>
  api<TrainerProfile>("/trainers/me");

export const fetchTrainerById = (trainerId: string) =>
  api<TrainerDetail>(`/trainers/${trainerId}`);

export const fetchTrainers = () =>
  api<TrainerListItem[]>("/trainers");

export const createTrainerRequest = (trainerId: string) =>
  api(`/trainers/${trainerId}/request`, {
    method: "POST"
  });

export const fetchTrainerRequests = () =>
  api<TrainerRequestItem[]>("/trainers/requests");

export const respondToTrainerRequest = (
  requestId: string,
  action: "ACCEPT" | "REJECT"
) =>
  api(`/trainers/requests/${requestId}`, {
    method: "PATCH",
    body: JSON.stringify({ action })
  });

export const updateTrainerProfile = (expertise: string[]) =>
  api<TrainerProfile>("/trainers/me", {
    method: "PUT",
    body: JSON.stringify({ expertise })
  });
