The client got a 400. The body had two JSON documents in it.

Here is the Gin handler, and it looks fine:

if err := c.ShouldBindJSON(&in); err != nil || in.Quantity <= 0 {
    c.JSON(http.StatusBadRequest, gin.H{"error": "quantity must be positive"})
}
c.JSON(http.StatusOK, gin.H{"status": "created"})

Send quantity 0. You get status 400, and a body that reads {"error":...}{"status":"created"}. Writing a response does not stop a handler. Nothing threw. The function kept going, the second write could not change the status that already went out, so it appended. Gin logs "Headers were already written" and moves on. A strict client fails to parse either document.

The middleware next to it has the same bug in the other direction: it writes a 401 for a missing API key and then calls c.Next(). The order gets created anyway.

Coming from Java or Python, where the framework ends the request by raising, this is the shift: Go hands you the writer and expects you to leave. Two words fix it, return in the handler, Abort in the middleware, and both are yours to type.

I turned it into a lab you can run in the browser. Nothing to install: predict what the client receives, then fix the handler and watch four tests go green. It runs on a small stub of Gin's request flow compiled into the page, and it says so.

https://anthonykot.github.io/book13/#lab-14

It is the second of three new labs on the code around a service. The first is the GORM query that silently drops a false (db.Where(&User{Active: false}) returns everyone). The third is the JSON decoder that cannot tell "not sent" from "sent as zero". Same shape, three places.

Which of the three has bitten you?
