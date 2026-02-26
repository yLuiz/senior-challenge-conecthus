import { useAuth } from "@/context/AuthContext";

export function TasksPage() {

    const { logout } = useAuth();

    return <>
        <h1>WELCOME TO TASK MANAGER</h1>
        <button onClick={logout}>Sair</button>
    </>
}