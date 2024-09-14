import { api } from "./_generated/api";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    // Grab the most recent messages.
    const messages = await ctx.db.query("messages").order("desc").take(100);
    // Grab the likes for each message.
    const messageWithLikes = await Promise.all(
      messages.map(async (message) => {
      const likes = await ctx.db.query("likes").withIndex("byMessageId", (q) => q.eq("messageId", message._id)).collect();
      return {
        ...message,
        likes: likes.length,
      };
    }),
    );
    
    // Message containing ":)" will be replaced with "😊"
    // messages.forEach((message) => {
    //   message.body = message.body.replace(":)", "😊");
    // });
    // Reverse the list so that it's in a chronological order.
    return messageWithLikes.reverse().map((message) => ({
      ...message,
      //Format smiley faces
      body: message.body.replace(":)", "😊"),
    }));
  },
});

export const send = mutation({
  args: { body: v.string(), author: v.string() },
  handler: async (ctx, { body, author }) => {
    // Send a new message.
    await ctx.db.insert("messages", { body, author });

    if(body.startsWith("@ai") && author !== "AI Agent") {
      // Schedule the chat action to run immediately.
      await ctx.scheduler.runAfter(0, api.ai.chat, { messageBody: body });
      return;
    }
  },
});

export const like = mutation({
  args: { messageId: v.id("messages"), liker: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("likes", { 
      liker: args.liker,
      messageId: args.messageId,
    });
  },
})
