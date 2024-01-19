/**
 * @param responses 
 * 
 * @returns {{ query: * | null, data: Array }}
 */
export function parseQueryLayersPromiseResponses(responses) {
  return {
    query: responses[0] ? responses[0].query: null,
    data: responses.flatMap(r => r.data || []),
  };
}