import { z } from "zod"

export const opportunityJsonSchema = {
  type: "object",
  properties: {
    opportunities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          type: {
            type: "string",
            enum: [
              "DEVELOPMENT_GRANT",
              "PRODUCTION_GRANT",
              "POST_PRODUCTION_GRANT",
              "SCRIPT_CONTEST",
              "FILM_FESTIVAL",
            ],
          },
          organizer: { type: "string" },
          description: { type: "string" },
          deadline: { type: ["string", "null"] },
          officialUrl: { type: ["string", "null"] },
          registrationUrl: { type: ["string", "null"] },
          reason: { type: "string" },
          verificationStatus: {
            type: "string",
            enum: ["REPORTED_OPEN", "UNVERIFIED"],
          },
        },
        required: [
          "title",
          "type",
          "organizer",
          "description",
          "deadline",
          "officialUrl",
          "registrationUrl",
          "reason",
          "verificationStatus",
        ],
      },
    },
  },
  required: ["opportunities"],
}

export const opportunitySchema = z.object({
  opportunities: z.array(
    z.object({
      title: z.string(),
      type: z.enum([
        "DEVELOPMENT_GRANT",
        "PRODUCTION_GRANT",
        "POST_PRODUCTION_GRANT",
        "SCRIPT_CONTEST",
        "FILM_FESTIVAL",
      ]),
      organizer: z.string(),
      description: z.string(),
      deadline: z.string().nullable(),
      officialUrl: z.url().nullable(),
      registrationUrl: z.url().nullable(),
      reason: z.string(),
      verificationStatus: z.enum(["REPORTED_OPEN", "UNVERIFIED"]),
    }),
  ),
})
