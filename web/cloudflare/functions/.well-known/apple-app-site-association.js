export async function onRequest() {
  const aasa = {
    "applinks": {
      "apps": [],
      "details": []
    }
  };

  return new Response(JSON.stringify(aasa), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400"
    }
  });
}
