export type Drop = {
    id: string,
    short: string,
    long: string,
}

export function getDrops(): Drop[] {
    return [
        {
            id: "1",
            short: "jan",
            long: "January",
        },
        {
            id: "2",
            short: "fed",
            long: "February",
        },
        {
            id: "3",
            short: "mar",
            long: "March",
        },
        {
            id: "4",
            short: "apr",
            long: "April",
        }
    ]
}
