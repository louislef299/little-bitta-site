export type Drop = {
    id: string,
    long: string,
}

export function getDrops(): Drop[] {
    return [
        {
            id: "jan",
            long: "January",
        },
        {
            id: "fed",
            long: "February",
        },
        {
            id: "mar",
            long: "March",
        },
        {
            id: "apr",
            long: "April",
        }
    ]
}
