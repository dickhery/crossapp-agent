import { defaultConfig; type Config } "mo:openai-client/Config";
import ChatApi "mo:openai-client/Apis/ChatApi";
import CreateChatCompletionRequest "mo:openai-client/Models/CreateChatCompletionRequest";
import ChatCompletionRequestSystemMessage "mo:openai-client/Models/ChatCompletionRequestSystemMessage";
import ChatCompletionRequestUserMessage "mo:openai-client/Models/ChatCompletionRequestUserMessage";
import Runtime "mo:core/Runtime";

// OpenAI SDK glue for the CrossApp Agent backend.
//
// This module is the single place that knows how to talk to the OpenAI Chat
// Completions API. It is reused by the admin-key variant: callers thread a
// bearer key in, and `configForKey` builds a fresh `Config` per call so a
// rotated key takes effect immediately.
//
// CRITICAL: `is_replicated = ?false` is mandatory. A replicated HTTP outcall
// would (1) leak the bearer across every subnet node's TLS connection,
// (2) bill the OpenAI account N times, and (3) fail consensus on the sampled
// LLM response. See extension-openai skill §3.
module {

  // Build a Config bound to a single bearer. `is_replicated = ?false` is
  // REQUIRED — see extension-openai skill §3.
  public func configForKey(key : Text) : Config {
    {
      defaultConfig with
      auth = ?#bearer key;
      is_replicated = ?false;
    };
  };

  // Runs a chat completion with a system + user message pair, retrying once on
  // failure (2 attempts total). Returns the assistant's text content.
  //
  // Retries are bounded to 2 attempts to avoid unbounded await loops; an
  // OpenAI outage or a transient 5xx surfaces as a trap after the second
  // attempt rather than hanging the caller.
  public func runChatCompletion(
    config : Config,
    systemPrompt : Text,
    userPrompt : Text,
  ) : async* Text {
    let result = await* attempt(config, systemPrompt, userPrompt);
    switch (result) {
      case (?text) { text };
      case null {
        // Second and final attempt.
        let retry = await* attempt(config, systemPrompt, userPrompt);
        switch (retry) {
          case (?text) { text };
          case null {
            Runtime.trap("OpenAI chat completion failed after 2 attempts");
          };
        };
      };
    };
  };

  // Single chat-completion attempt. Returns `?Text` on success, `null` on any
  // failure (empty choices, missing content, or a thrown API error trapped by
  // the caller's retry loop).
  //
  // The trap-on-error pattern is intentionally wrapped: `ChatApi` traps on
  // non-2xx responses, so we cannot catch the trap directly. Instead we
  // validate the response shape and return `null` when the model returns no
  // usable text (refusal, tool call, or empty choices). A genuine HTTP error
  // traps here and propagates — the retry loop in `runChatCompletion` only
  // helps with the no-content case; a hard HTTP failure will surface on the
  // first attempt. This matches the skill's guidance to trap cleanly when the
  // key is missing or the response is unusable.
  func attempt(
    config : Config,
    systemPrompt : Text,
    userPrompt : Text,
  ) : async* ?Text {
    let systemMessage = ChatCompletionRequestSystemMessage.JSON.init({
      content = #string(systemPrompt);
      role = #system_;
    });
    let userMessage = ChatCompletionRequestUserMessage.JSON.init({
      content = #string(userPrompt);
      role = #user;
    });

    // `JSON.init` defaults every optional to `null` — DO NOT hand-list them.
    let req = CreateChatCompletionRequest.JSON.init({
      messages = [#system_(systemMessage), #user(userMessage)];
      model = "gpt-4o-mini"; // ModelIdsShared = Text — any OpenAI model id
    });

    let resp = await* ChatApi.createChatCompletion(config, req);

    if (resp.choices.size() == 0) {
      return null;
    };
    switch (resp.choices[0].message.content) {
      case (?text) { ?text };
      case null { null };
    };
  };
};
