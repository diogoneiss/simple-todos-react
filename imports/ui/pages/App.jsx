import { Meteor } from 'meteor/meteor';
import React, { useState, Fragment } from 'react';
import { useTracker } from 'meteor/react-meteor-data';
import { TasksCollection } from '/imports/db/TasksCollection';
import { Task } from '../Task';
import { TaskForm } from '../TaskForm';
import { LoginForm } from './LoginPage';
import { Typography, Container, Box, TextField, FormControlLabel, Switch, Button } from '@mui/material';
import CenteredLoading from '../components/CenteredLoading';
import { taskStatuses } from '../../models/taskModel';
import { TodoHeader } from './todoHeader';
const deleteTask = ({ _id }) => Meteor.call('tasks.remove', _id);


const App = () => {
  const [showCompleted, setShowCompleted] = useState(false);
  const [showUserTasks, setShowUserTasks] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };


  const handleNextPage = () => {
    setCurrentPage(prevPage => prevPage + 1);
  };
  const handlePrevPage = () => {
    setCurrentPage(prevPage => prevPage > 1 ? prevPage - 1 : 1);
  };

  const user = useTracker(() => Meteor.user());
  console.log(user);

  const userFilter = user ? { userId: user._id } : {};

  const pendingOnlyFilter = { ...{ status: { $in: [taskStatuses.CADASTRADA, taskStatuses.EM_ANDAMENTO] } }, ...userFilter };

  const { tasks, isLoading } = useTracker(() => {
    const noDataAvailable = { tasks: [] };
    if (!Meteor.user()) {
      return noDataAvailable;
    }

    const handler = Meteor.subscribe('tasks', currentPage, searchQuery, showCompleted);

    if (!handler.ready()) {
      return { ...noDataAvailable, isLoading: true };
    }

    const tasks = TasksCollection.find({}).fetch();

    return { tasks, isLoading: false };
  });

  console.log("Tamanho do tasks: ", tasks.length)

  return (
    <div className="app">
      

      <div className="main">
        <Fragment>
          <TodoHeader searchQuery={searchQuery} showCompleted={showCompleted} />
          <TaskForm />
          <Container maxWidth="sm">
            <Box mt={2}>
              <TextField
                label="Buscar tarefas"
                variant="outlined"
                value={searchQuery}
                onChange={handleSearchChange}
                fullWidth
                sx={{ marginBottom: '1rem' }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showCompleted}
                    onChange={() => setShowCompleted(!showCompleted)}
                    color="primary"
                  />
                }
                label="Mostrar completas"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showUserTasks}
                    onChange={() => setShowUserTasks(!showUserTasks)}
                    color="primary"
                  />
                }
                label="Mostrar apenas minhas tarefas"
              />
            </Box>
          </Container>
          { /*
            <div className="filter">
              <button onClick={() => setHideCompleted(!hideCompleted)}>
                {hideCompleted ? 'Show All' : 'Hide Completed'}
              </button>
            </div>
            */}

          {isLoading && <CenteredLoading />}

          <ul className="tasks">
            {tasks.map(task => (
              <Task
                key={task._id}
                task={task}
                onDeleteClick={deleteTask}
              />
            ))}
          </ul>
          <Box mt={3} display="flex" justifyContent="center" alignItems="center">
            <Button
              variant="outlined"
              color="primary"
              onClick={handlePrevPage}
              disabled={currentPage === 1}>
              Anterior
            </Button>

            <Typography variant="body1" sx={{ mx: 2 }}>
              Página {currentPage}
            </Typography>

            <Button
              variant="outlined"
              color="primary"
              onClick={handleNextPage}
              disabled={tasks.length < 4}>
              Próxima
            </Button>
          </Box>

        </Fragment>

      </div>

    </div>
  );
};

export default App;