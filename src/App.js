import React, { useState, useEffect } from 'react'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import {
  AppBar, Toolbar, List, ListItem, ListItemText, Dialog,
  DialogTitle, DialogContent, DialogContentText, DialogActions, TextField,
  Button, Fab, LinearProgress, Typography, IconButton, Grid
} from '@mui/material'
import { makeStyles } from '@mui/styles'
import AddIcon from '@mui/icons-material/Add'
import GitHubIcon from '@mui/icons-material/GitHub'
import pushdrop from 'pushdrop'
import {
  createAction, toBEEFfromEnvelope
} from '@babbage/sdk-ts'
import { Transaction } from '@bsv/sdk'

const useStyles = makeStyles({
  app_bar_placeholder: {
    height: '4em'
  },
  add_fab: {
    position: 'fixed',
    zIndex: 10
  },
  add_more_fab: {
    position: 'fixed',
    right: '1em',
    bottom: '1em',
    zIndex: 10
  },
  loading_bar: {
    margin: '1em'
  },
  github_icon: {
    color: '#ffffff'
  },
  app_bar_grid: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gridGap: '1em'
  },
  no_items: {
    margin: 'auto',
    textAlign: 'center',
    marginTop: '5em'
  }
}, { name: 'App' })

const App = () => {
  const [createOpen, setCreateOpen] = useState(false)
  const [createTask, setCreateTask] = useState('')
  const [createAmount, setCreateAmount] = useState(1000)
  const [createLoading, setCreateLoading] = useState(false)
  const [tasksLoading, setTasksLoading] = useState(true)
  const [tasks, setTasks] = useState([])
  const classes = useStyles()

  const hostingURL = 'https://prod-overlay-services-ivi63c6zsq-uw.a.run.app'

  const handleCreateSubmit = async e => {
    e.preventDefault()
    try {
      if (!createTask) {
        toast.error('Enter a message to broadcast!')
        return
      }
      if (!createAmount) {
        toast.error('Enter an amount!')
        return
      }
      if (Number(createAmount) < 500) {
        toast.error('The amount must be more than 500 satoshis!')
        return
      }
      setCreateLoading(true)

      const bitcoinOutputScript = await pushdrop.create({
        fields: [
          Buffer.from(createTask)
        ],
        protocolID: 'helloworld',
        keyID: '1'
      })

      const newToken = await createAction({
        outputs: [{
          satoshis: Number(createAmount),
          script: bitcoinOutputScript,
          description: 'New HelloWorld item'
        }],
        description: 'Create a HelloWorld token',
      })

      const beef = toBEEFfromEnvelope({
        rawTx: newToken.rawTx,
        inputs: newToken.inputs,
        txid: newToken.txid
      }).beef

      const result = await fetch(`${hostingURL}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Topics': JSON.stringify(['tm_helloworld'])
        },
        body: new Uint8Array(beef)
      })

      const resultData = await result.json()
      console.log(resultData)

      toast.dark('Token successfully created!')
      setTasks(originalTasks => ([
        {
          task: createTask,
          sats: Number(createAmount),
          token: {
            ...newToken,
            lockingScript: bitcoinOutputScript,
            outputIndex: 0
          }
        },
        ...originalTasks
      ]))
      setCreateTask('')
      setCreateAmount(1000)
      setCreateOpen(false)
    } catch (e) {
      toast.error(e.message)
      console.error(e)
    } finally {
      setCreateLoading(false)
    }
  }

  const fetchTasks = async () => {
    try {
      const result = await fetch(`${hostingURL}/lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          service: 'ls_helloworld',
          query: 'findAll'
        })
      })
      const lookupAnswer = await result.json()

      if (lookupAnswer.type === 'output-list') {
        const tasksFromLookup = await Promise.all(lookupAnswer.outputs.map(async output => {
          const tx = Transaction.fromBEEF(output.beef)

          const result = pushdrop.decode({
            script: tx.outputs[output.outputIndex].lockingScript.toHex(),
            fieldFormat: 'buffer'
          })

          const helloMessage = result.fields[0].toString('utf8')

          return {
            task: helloMessage,
            sats: tx.outputs[output.outputIndex].satoshis,
            token: {
              txid: tx.txid,
              outputIndex: output.outputIndex,
              lockingScript: tx.outputs[output.outputIndex].lockingScript.toHex()
            }
          }
        }))

        setTasks(tasksFromLookup.reverse())
      }
    } catch (e) {
      toast.error(`Failed to load tasks! Error: ${e.message}`)
      console.error(e)
    } finally {
      setTasksLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  return (
    <>
      <ToastContainer />
      <AppBar>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            HelloWorld Overlay Example
          </Typography>
          <IconButton
            size='large'
            color='inherit'
            onClick={() => {
              window.open('https://github.com/p2ppsr/todo-react', '_blank')
            }}
          >
            <GitHubIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <div className={classes.app_bar_placeholder} />

      {tasks.length >= 1 && (
        <div className={classes.add_more_fab}>
          <Fab color='primary' onClick={() => setCreateOpen(true)}>
            <AddIcon />
          </Fab>
        </div>
      )}

      {tasksLoading
        ? <LinearProgress className={classes.loading_bar} />
        : (
          <List>
            {tasks.length === 0 && (
              <div>
                <Grid container direction='column' className={classes.no_items}>
                  <Grid item align='center'>
                    <Typography variant='h4'>No Messages</Typography>
                    <Typography color='textSecondary'>
                      Use the button below to broadcast a message
                    </Typography>
                  </Grid>
                  <Grid item align='center' sx={{ paddingTop: '2.5em' }}>
                    <Fab color='primary' className={classes.add_fab} onClick={() => setCreateOpen(true)}>
                      <AddIcon />
                    </Fab>
                  </Grid>
                </Grid>
              </div>
            )}
            {tasks.map((x, i) => (
              <ListItem key={i}>
                <ListItemText
                  primary={x.task}
                  secondary={`${x.sats} satoshis`}
                />
              </ListItem>
            ))}
          </List>
        )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)}>
        <form onSubmit={handleCreateSubmit}>
          <DialogTitle>
            Broadcast a Message
          </DialogTitle>
          <DialogContent>
            <DialogContentText paragraph>
              Enter your message to be broadcasted on the blockchain. Set aside some satoshis for the transaction.
            </DialogContentText>
            <TextField
              multiline rows={3} fullWidth autoFocus
              label='Message'
              onChange={e => setCreateTask(e.target.value)}
              value={createTask}
            />
            <br />
            <br />
            <TextField
              fullWidth type='number' min={100}
              label='Transaction amount'
              onChange={e => setCreateAmount(e.target.value)}
              value={createAmount}
            />
          </DialogContent>
          {createLoading
            ? <LinearProgress className={classes.loading_bar} />
            : (
              <DialogActions>
                <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button type='submit'>Broadcast</Button>
              </DialogActions>
            )}
        </form>
      </Dialog>
    </>
  )
}

export default App
