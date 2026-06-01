```
socket.onmessage =
    (
        event
    ) => {
        const data =
            JSON.parse(
                event.data
            );

        if (
            data.type ===
            "DRIVER_LOCATION"
        ) {
            console.log(
                data.payload
            );
        }
    };

    res: {
            "type":
                "DRIVER_LOCATION",

            "payload": {
                "latitude":
                22.29,

                "longitude":
                87.91
            }
        }
```